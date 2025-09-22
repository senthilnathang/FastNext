import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.models.user import User
from app.models.workflow import WorkflowType, WorkflowState, WorkflowTemplate
from app.auth.deps import get_current_active_user

# Test database setup
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_workflow_api.db"
engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

def override_get_current_user():
    """Override current user dependency for testing"""
    return User(
        id=1,
        email="test@example.com", 
        username="testuser",
        full_name="Test User",
        is_active=True,
        is_superuser=True
    )

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_active_user] = override_get_current_user

client = TestClient(app)

@pytest.fixture(scope="function")
def setup_database():
    """Setup test database"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def test_data(setup_database):
    """Create test data"""
    db = TestingSessionLocal()
    
    # Create test user
    user = User(
        id=1,
        email="test@example.com",
        username="testuser", 
        full_name="Test User",
        hashed_password="hashedpass",
        is_active=True,
        is_superuser=True
    )
    db.add(user)
    
    # Create test workflow states
    states = [
        WorkflowState(
            id=1,
            name="new",
            label="New",
            description="New state",
            color="#3B82F6",
            bg_color="#EFF6FF",
            icon="plus-circle",
            is_initial=True,
            is_final=False
        ),
        WorkflowState(
            id=2,
            name="completed",
            label="Completed", 
            description="Completed state",
            color="#10B981",
            bg_color="#ECFDF5",
            icon="check-circle",
            is_initial=False,
            is_final=True
        )
    ]
    
    for state in states:
        db.add(state)
    
    db.commit()
    db.close()
    return {"user_id": 1, "state_ids": [1, 2]}

class TestWorkflowTypeAPI:
    """Test workflow type API endpoints"""
    
    def test_create_workflow_type(self, test_data):
        """Test creating a workflow type"""
        workflow_type_data = {
            "name": "Sales Process",
            "description": "Sales order processing",
            "icon": "ShoppingCart",
            "color": "#3B82F6",
            "is_active": True
        }
        
        response = client.post("/api/workflow-types/", json=workflow_type_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Sales Process"
        assert data["description"] == "Sales order processing"
        assert data["icon"] == "ShoppingCart"
        assert data["color"] == "#3B82F6"
        assert data["is_active"] == True
        assert data["created_by"] == 1
        assert "id" in data
        assert "created_at" in data
    
    def test_get_workflow_types(self, test_data):
        """Test getting workflow types"""
        # First create a workflow type
        workflow_type_data = {
            "name": "Purchase Process",
            "description": "Purchase order processing",
            "icon": "Package"
        }
        client.post("/api/workflow-types/", json=workflow_type_data)
        
        # Get workflow types
        response = client.get("/api/workflow-types/")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert len(data["items"]) >= 1
        assert data["items"][0]["name"] == "Purchase Process"
    
    def test_get_workflow_type_by_id(self, test_data):
        """Test getting workflow type by ID"""
        # Create workflow type
        workflow_type_data = {
            "name": "Invoice Process",
            "description": "Invoice processing workflow"
        }
        create_response = client.post("/api/workflow-types/", json=workflow_type_data)
        created_id = create_response.json()["id"]
        
        # Get by ID
        response = client.get(f"/api/workflow-types/{created_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == created_id
        assert data["name"] == "Invoice Process"
    
    def test_update_workflow_type(self, test_data):
        """Test updating workflow type"""
        # Create workflow type
        workflow_type_data = {
            "name": "Payment Process",
            "description": "Payment processing workflow"
        }
        create_response = client.post("/api/workflow-types/", json=workflow_type_data)
        created_id = create_response.json()["id"]
        
        # Update
        update_data = {
            "description": "Updated payment processing workflow",
            "color": "#10B981"
        }
        response = client.put(f"/api/workflow-types/{created_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["description"] == "Updated payment processing workflow"
        assert data["color"] == "#10B981"
        assert data["name"] == "Payment Process"  # Should remain unchanged
    
    def test_delete_workflow_type(self, test_data):
        """Test deleting workflow type (soft delete)"""
        # Create workflow type
        workflow_type_data = {
            "name": "Temp Process",
            "description": "Temporary workflow"
        }
        create_response = client.post("/api/workflow-types/", json=workflow_type_data)
        created_id = create_response.json()["id"]
        
        # Delete
        response = client.delete(f"/api/workflow-types/{created_id}")
        assert response.status_code == 200
        assert "message" in response.json()
        
        # Verify it's soft deleted (should return 404 or not in active list)
        get_response = client.get(f"/api/workflow-types/{created_id}")
        # The item should still exist but be marked as inactive
        if get_response.status_code == 200:
            assert get_response.json()["is_active"] == False

class TestWorkflowStateAPI:
    """Test workflow state API endpoints"""
    
    def test_create_workflow_state(self, test_data):
        """Test creating a workflow state"""
        state_data = {
            "name": "pending",
            "label": "Pending Approval",
            "description": "Waiting for approval",
            "color": "#F59E0B",
            "bg_color": "#FFFBEB",
            "icon": "clock",
            "is_initial": False,
            "is_final": False
        }
        
        response = client.post("/api/workflow-states/", json=state_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "pending"
        assert data["label"] == "Pending Approval"
        assert data["color"] == "#F59E0B"
        assert data["is_initial"] == False
        assert data["is_final"] == False
        assert "id" in data
    
    def test_get_workflow_states(self, test_data):
        """Test getting workflow states"""
        response = client.get("/api/workflow-states/")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert len(data["items"]) >= 2  # From test_data fixture
    
    def test_workflow_state_search(self, test_data):
        """Test searching workflow states"""
        response = client.get("/api/workflow-states/?search=new")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        # Should find the "new" state from test data
        found_new = any(item["name"] == "new" for item in data["items"])
        assert found_new

class TestWorkflowTemplateAPI:
    """Test workflow template API endpoints"""
    
    def test_create_workflow_template(self, test_data):
        """Test creating a workflow template"""
        # First create a workflow type
        workflow_type_data = {
            "name": "Template Test Process",
            "description": "For template testing"
        }
        type_response = client.post("/api/workflow-types/", json=workflow_type_data)
        workflow_type_id = type_response.json()["id"]
        
        # Create template
        template_data = {
            "name": "Standard Sales Template",
            "description": "Standard sales process template",
            "workflow_type_id": workflow_type_id,
            "default_state_id": 1,  # From test_data
            "is_active": True,
            "nodes": [
                {
                    "id": "node1",
                    "type": "workflowState",
                    "position": {"x": 100, "y": 100},
                    "data": {"label": "New Order", "stateId": 1}
                },
                {
                    "id": "node2", 
                    "type": "workflowState",
                    "position": {"x": 300, "y": 100},
                    "data": {"label": "Completed", "stateId": 2}
                }
            ],
            "edges": [
                {
                    "id": "edge1",
                    "source": "node1",
                    "target": "node2",
                    "data": {"action": "complete", "label": "Complete Order"}
                }
            ],
            "settings": {"auto_assign": True}
        }
        
        response = client.post("/api/workflow-templates/", json=template_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Standard Sales Template"
        assert data["workflow_type_id"] == workflow_type_id
        assert data["default_state_id"] == 1
        assert len(data["nodes"]) == 2
        assert len(data["edges"]) == 1
        assert data["settings"]["auto_assign"] == True
        assert "id" in data
    
    def test_get_workflow_templates(self, test_data):
        """Test getting workflow templates"""
        response = client.get("/api/workflow-templates/")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "total" in data
    
    def test_get_workflow_templates_by_type(self, test_data):
        """Test filtering templates by workflow type"""
        # Create workflow type and template
        workflow_type_data = {"name": "Filter Test Process"}
        type_response = client.post("/api/workflow-types/", json=workflow_type_data)
        workflow_type_id = type_response.json()["id"]
        
        template_data = {
            "name": "Filter Test Template",
            "workflow_type_id": workflow_type_id,
            "nodes": [],
            "edges": []
        }
        client.post("/api/workflow-templates/", json=template_data)
        
        # Filter by workflow type
        response = client.get(f"/api/workflow-templates/?workflow_type_id={workflow_type_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["items"]) >= 1
        assert all(item["workflow_type_id"] == workflow_type_id for item in data["items"])
    
    def test_update_workflow_template(self, test_data):
        """Test updating workflow template"""
        # Create workflow type and template
        workflow_type_data = {"name": "Update Test Process"}
        type_response = client.post("/api/workflow-types/", json=workflow_type_data)
        workflow_type_id = type_response.json()["id"]
        
        template_data = {
            "name": "Update Test Template",
            "workflow_type_id": workflow_type_id,
            "nodes": [],
            "edges": []
        }
        create_response = client.post("/api/workflow-templates/", json=template_data)
        template_id = create_response.json()["id"]
        
        # Update template
        update_data = {
            "description": "Updated description",
            "nodes": [
                {
                    "id": "new_node",
                    "type": "workflowState", 
                    "position": {"x": 150, "y": 150},
                    "data": {"label": "New Node", "stateId": 1}
                }
            ]
        }
        
        response = client.put(f"/api/workflow-templates/{template_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["description"] == "Updated description"
        assert len(data["nodes"]) == 1
        assert data["nodes"][0]["id"] == "new_node"
    
    def test_template_validation_errors(self, test_data):
        """Test template validation errors"""
        # Try to create template with invalid workflow_type_id
        template_data = {
            "name": "Invalid Template",
            "workflow_type_id": 99999,  # Non-existent ID
            "nodes": [],
            "edges": []
        }
        
        response = client.post("/api/workflow-templates/", json=template_data)
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
        
        # Try to create template with invalid default_state_id
        workflow_type_data = {"name": "Validation Test Process"}
        type_response = client.post("/api/workflow-types/", json=workflow_type_data)
        workflow_type_id = type_response.json()["id"]
        
        template_data = {
            "name": "Invalid State Template",
            "workflow_type_id": workflow_type_id,
            "default_state_id": 99999,  # Non-existent state ID
            "nodes": [],
            "edges": []
        }
        
        response = client.post("/api/workflow-templates/", json=template_data)
        assert response.status_code == 404
        assert "state not found" in response.json()["detail"].lower()

class TestWorkflowAPIErrors:
    """Test API error handling"""
    
    def test_duplicate_workflow_type_name(self, test_data):
        """Test creating workflow type with duplicate name"""
        workflow_type_data = {
            "name": "Duplicate Test",
            "description": "First instance"
        }
        
        # Create first instance
        response1 = client.post("/api/workflow-types/", json=workflow_type_data)
        assert response1.status_code == 200
        
        # Try to create duplicate
        response2 = client.post("/api/workflow-types/", json=workflow_type_data)
        assert response2.status_code == 400
        assert "already exists" in response2.json()["detail"].lower()
    
    def test_duplicate_workflow_state_name(self, test_data):
        """Test creating workflow state with duplicate name"""
        state_data = {
            "name": "duplicate_state",
            "label": "Duplicate State"
        }
        
        # Create first instance
        response1 = client.post("/api/workflow-states/", json=state_data)
        assert response1.status_code == 200
        
        # Try to create duplicate
        response2 = client.post("/api/workflow-states/", json=state_data)
        assert response2.status_code == 400
        assert "already exists" in response2.json()["detail"].lower()
    
    def test_not_found_errors(self, test_data):
        """Test 404 errors for non-existent resources"""
        # Test workflow type not found
        response = client.get("/api/workflow-types/99999")
        assert response.status_code == 404
        
        # Test workflow state not found
        response = client.get("/api/workflow-states/99999")
        assert response.status_code == 404
        
        # Test workflow template not found
        response = client.get("/api/workflow-templates/99999")
        assert response.status_code == 404

class TestWorkflowAPIPagination:
    """Test API pagination"""
    
    def test_workflow_types_pagination(self, test_data):
        """Test workflow types pagination"""
        # Create multiple workflow types
        for i in range(5):
            workflow_type_data = {
                "name": f"Pagination Test {i}",
                "description": f"Test workflow {i}"
            }
            client.post("/api/workflow-types/", json=workflow_type_data)
        
        # Test pagination
        response = client.get("/api/workflow-types/?limit=2&skip=0")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["items"]) <= 2
        assert data["total"] >= 5
        
        # Test next page
        response = client.get("/api/workflow-types/?limit=2&skip=2")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["items"]) <= 2
    
    def test_search_functionality(self, test_data):
        """Test search functionality"""
        # Create workflow types with searchable names
        search_types = [
            {"name": "Sales Order Process", "description": "Handle sales orders"},
            {"name": "Purchase Workflow", "description": "Purchase order management"},
            {"name": "Invoice Processing", "description": "Invoice handling workflow"}
        ]
        
        for wf_type in search_types:
            client.post("/api/workflow-types/", json=wf_type)
        
        # Search by name
        response = client.get("/api/workflow-types/?search=sales")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["items"]) >= 1
        assert any("sales" in item["name"].lower() for item in data["items"])
        
        # Search by description
        response = client.get("/api/workflow-types/?search=invoice")
        assert response.status_code == 200
        
        data = response.json()
        found_items = [item for item in data["items"] 
                      if "invoice" in item["name"].lower() or "invoice" in (item["description"] or "").lower()]
        assert len(found_items) >= 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])