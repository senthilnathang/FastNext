from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json
import asyncio
import logging
from enum import Enum

from app.models.workflow import (
    WorkflowInstance, WorkflowTemplate, WorkflowState, WorkflowHistory,
    InstanceStatus, WorkflowNodeType
)
from app.models.user import User

# Setup logger
logger = logging.getLogger(__name__)


class WorkflowExecutionError(Exception):
    pass


class ExecutionResult(Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"
    WAITING = "waiting"


class WorkflowEngine:
    """
    Workflow execution engine that processes workflow instances
    based on their templates and current state.
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    async def start_workflow(
        self, 
        template_id: int, 
        entity_id: str, 
        entity_type: str,
        initial_data: Dict[str, Any] = None,
        created_by: int = None,
        title: str = None
    ) -> WorkflowInstance:
        """Start a new workflow instance"""
        
        template = self.db.query(WorkflowTemplate).filter(
            WorkflowTemplate.id == template_id
        ).first()
        
        if not template:
            raise WorkflowExecutionError(f"Template {template_id} not found")
        
        if not template.is_active:
            raise WorkflowExecutionError(f"Template {template_id} is not active")
        
        # Find start node or use default state
        start_state = self._find_start_state(template)
        if not start_state:
            raise WorkflowExecutionError("No start state found in template")
        
        # Create workflow instance
        instance = WorkflowInstance(
            template_id=template_id,
            workflow_type_id=template.workflow_type_id,
            current_state_id=start_state.id,
            status=InstanceStatus.RUNNING,
            entity_id=entity_id,
            entity_type=entity_type,
            title=title or f"{template.name} - {entity_id}",
            data=initial_data or {},
            context={},
            active_nodes=[start_state.id],
            created_by=created_by,
            started_at=datetime.utcnow()
        )
        
        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)
        
        # Log initial state
        self._log_state_change(
            instance.id, 
            None, 
            start_state.id, 
            "workflow_started", 
            created_by,
            "Workflow instance started"
        )
        
        return instance
    
    async def execute_action(
        self, 
        instance_id: int, 
        action: str, 
        user_id: int,
        comment: str = None,
        data: Dict[str, Any] = None
    ) -> ExecutionResult:
        """Execute an action on a workflow instance"""
        
        instance = self.db.query(WorkflowInstance).filter(
            WorkflowInstance.id == instance_id
        ).first()
        
        if not instance:
            raise WorkflowExecutionError(f"Instance {instance_id} not found")
        
        if instance.status not in [InstanceStatus.RUNNING, InstanceStatus.PENDING]:
            raise WorkflowExecutionError(f"Instance {instance_id} is not in a runnable state")
        
        template = instance.template
        
        # Find valid transitions from current state
        valid_transitions = self._get_valid_transitions(
            template, instance.current_state_id, action
        )
        
        if not valid_transitions:
            raise WorkflowExecutionError(f"Action '{action}' not allowed from current state")
        
        # Check permissions
        if not self._check_permissions(template, action, user_id):
            raise WorkflowExecutionError(f"User {user_id} does not have permission for action '{action}'")
        
        # Execute transition
        for transition in valid_transitions:
            result = await self._execute_transition(
                instance, transition, user_id, comment, data
            )
            
            if result == ExecutionResult.SUCCESS:
                # Check if workflow is complete
                if self._is_workflow_complete(instance):
                    instance.status = InstanceStatus.COMPLETED
                    instance.completed_at = datetime.utcnow()
                    self.db.commit()
                
                return result
        
        return ExecutionResult.FAILED
    
    async def process_pending_workflows(self) -> List[Dict[str, Any]]:
        """Process all pending workflow instances (for scheduled execution)"""
        
        pending_instances = self.db.query(WorkflowInstance).filter(
            WorkflowInstance.status.in_([InstanceStatus.PENDING, InstanceStatus.RUNNING])
        ).all()
        
        results = []
        
        for instance in pending_instances:
            try:
                # Check for timer-based transitions
                timer_result = await self._process_timers(instance)
                results.append({
                    "instance_id": instance.id,
                    "result": timer_result,
                    "processed_at": datetime.utcnow()
                })
                
                # Check for SLA violations
                sla_result = await self._check_sla_violations(instance)
                if sla_result:
                    results.append({
                        "instance_id": instance.id,
                        "result": "sla_violation",
                        "details": sla_result,
                        "processed_at": datetime.utcnow()
                    })
                    
            except Exception as e:
                results.append({
                    "instance_id": instance.id,
                    "result": "error",
                    "error": str(e),
                    "processed_at": datetime.utcnow()
                })
        
        return results
    
    def _find_start_state(self, template: WorkflowTemplate) -> Optional[WorkflowState]:
        """Find the start state for a workflow template"""
        
        # Look for explicit start node in template
        for node in template.nodes:
            if node.get("type") == "start" or node.get("data", {}).get("isInitial"):
                state_id = node.get("data", {}).get("stateId")
                if state_id:
                    return self.db.query(WorkflowState).filter(
                        WorkflowState.id == state_id
                    ).first()
        
        # Fallback to default state
        return template.default_state
    
    def _get_valid_transitions(
        self, 
        template: WorkflowTemplate, 
        current_state_id: int, 
        action: str
    ) -> List[Dict[str, Any]]:
        """Get valid transitions from current state for given action"""
        
        valid_transitions = []
        
        for edge in template.edges:
            source_node = self._find_node_by_id(template, edge.get("source"))
            target_node = self._find_node_by_id(template, edge.get("target"))
            
            if (source_node and 
                source_node.get("data", {}).get("stateId") == current_state_id and
                edge.get("data", {}).get("action") == action):
                
                # Check conditions if any
                condition = edge.get("data", {}).get("condition")
                if condition and not self._evaluate_condition(condition, {}):
                    continue
                
                valid_transitions.append({
                    "edge": edge,
                    "source": source_node,
                    "target": target_node,
                    "target_state_id": target_node.get("data", {}).get("stateId")
                })
        
        return valid_transitions
    
    def _find_node_by_id(self, template: WorkflowTemplate, node_id: str) -> Optional[Dict[str, Any]]:
        """Find a node by its ID in the template"""
        for node in template.nodes:
            if node.get("id") == node_id:
                return node
        return None
    
    def _evaluate_condition(self, condition: str, context: Dict[str, Any]) -> bool:
        """Evaluate a condition expression"""
        # Simple condition evaluation - can be enhanced with expression parser
        try:
            # For now, just check simple equality conditions
            if "==" in condition:
                left, right = condition.split("==")
                left_val = context.get(left.strip())
                right_val = right.strip().strip('"\'')
                return str(left_val) == right_val
            return True
        except:
            return True
    
    def _check_permissions(self, template: WorkflowTemplate, action: str, user_id: int) -> bool:
        """Check if user has permission to execute action"""
        
        permissions = template.permissions.get(action, {})
        allowed_roles = permissions.get("allowed_roles", [])
        
        if not allowed_roles:
            return True  # No restrictions
        
        # Check user roles (simplified - would integrate with role system)
        user = self.db.query(User).filter(User.id == user_id).first()
        if user and user.is_superuser:
            return True
        
        # TODO: Implement proper role checking
        return True
    
    async def _execute_transition(
        self, 
        instance: WorkflowInstance, 
        transition: Dict[str, Any],
        user_id: int,
        comment: str = None,
        data: Dict[str, Any] = None
    ) -> ExecutionResult:
        """Execute a single transition"""
        
        target_state_id = transition["target_state_id"]
        old_state_id = instance.current_state_id
        
        # Update instance
        instance.current_state_id = target_state_id
        instance.updated_at = datetime.utcnow()
        
        # Update context data
        if data:
            instance.data.update(data)
        
        # Log transition
        self._log_state_change(
            instance.id,
            old_state_id,
            target_state_id,
            transition["edge"]["data"]["action"],
            user_id,
            comment
        )
        
        self.db.commit()
        
        # Execute any automated actions for the new state
        await self._execute_state_actions(instance, transition["target"])
        
        return ExecutionResult.SUCCESS
    
    async def _execute_state_actions(self, instance: WorkflowInstance, target_node: Dict[str, Any]):
        """Execute automated actions when entering a state"""
        
        node_type = target_node.get("type")
        node_data = target_node.get("data", {})
        
        if node_type == "service_task":
            # Execute service task
            service_name = node_data.get("service")
            if service_name:
                await self._execute_service_task(instance, service_name, node_data)
        
        elif node_type == "timer":
            # Set up timer
            duration = node_data.get("duration", 3600)  # Default 1 hour
            instance.deadline = datetime.utcnow() + timedelta(seconds=duration)
            self.db.commit()
    
    async def _execute_service_task(self, instance: WorkflowInstance, service_name: str, config: Dict[str, Any]):
        """Execute a service task (e.g., send email, call API)"""

        # This would integrate with external services
        # For now, just log the action
        logger.info(f"Executing service task '{service_name}' for workflow instance {instance.id}")
        
        # Example: Send notification
        if service_name == "send_notification":
            # await notification_service.send(...)
            pass
        
        # Example: Call external API
        elif service_name == "api_call":
            # await api_client.call(...)
            pass
    
    async def _process_timers(self, instance: WorkflowInstance) -> str:
        """Process timer-based transitions"""
        
        if instance.deadline and datetime.utcnow() > instance.deadline:
            # Timer expired - execute timeout transition
            template = instance.template
            
            # Find timeout transitions
            for edge in template.edges:
                if edge.get("data", {}).get("action") == "timeout":
                    source_node = self._find_node_by_id(template, edge.get("source"))
                    if (source_node and 
                        source_node.get("data", {}).get("stateId") == instance.current_state_id):
                        
                        transition = {
                            "edge": edge,
                            "source": source_node,
                            "target": self._find_node_by_id(template, edge.get("target")),
                            "target_state_id": self._find_node_by_id(template, edge.get("target")).get("data", {}).get("stateId")
                        }
                        
                        await self._execute_transition(
                            instance, transition, instance.created_by, "Timer expired"
                        )
                        return "timer_executed"
        
        return "no_action"
    
    async def _check_sla_violations(self, instance: WorkflowInstance) -> Optional[Dict[str, Any]]:
        """Check for SLA violations"""
        
        template = instance.template
        sla_config = template.sla_config
        
        if not sla_config:
            return None
        
        # Check if instance has exceeded SLA
        max_duration = sla_config.get("max_duration_hours", 24)
        if instance.started_at:
            elapsed_hours = (datetime.utcnow() - instance.started_at).total_seconds() / 3600
            
            if elapsed_hours > max_duration:
                return {
                    "type": "sla_violation",
                    "elapsed_hours": elapsed_hours,
                    "max_duration": max_duration,
                    "escalation_required": True
                }
        
        return None
    
    def _is_workflow_complete(self, instance: WorkflowInstance) -> bool:
        """Check if workflow has reached a final state"""
        
        current_state = self.db.query(WorkflowState).filter(
            WorkflowState.id == instance.current_state_id
        ).first()
        
        return current_state and current_state.is_final
    
    def _log_state_change(
        self, 
        instance_id: int, 
        from_state_id: Optional[int], 
        to_state_id: int,
        action: str, 
        user_id: int, 
        comment: str = None
    ):
        """Log state change in history"""
        
        history = WorkflowHistory(
            instance_id=instance_id,
            from_state_id=from_state_id,
            to_state_id=to_state_id,
            action=action,
            comment=comment,
            user_id=user_id,
            timestamp=datetime.utcnow()
        )
        
        self.db.add(history)
        self.db.commit()


# Service functions for API endpoints
def get_workflow_engine(db: Session) -> WorkflowEngine:
    """Get workflow engine instance"""
    return WorkflowEngine(db)