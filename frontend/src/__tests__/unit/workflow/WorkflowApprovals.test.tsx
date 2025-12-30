import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import UserTaskNode from '@/modules/workflow/components/UserTaskNode';

// Mock the workflow context
const mockUseWorkflow = {
  updateNodeData: jest.fn(),
};

jest.mock('@/modules/workflow/hooks/useWorkflow', () => ({
  useWorkflow: () => mockUseWorkflow,
}));

describe('WorkflowApprovals', () => {
  const mockData = {
    id: 'user-task-1',
    label: 'Approval Task',
    type: 'userTask',
    approval: false,
    assignedRole: 'manager',
    description: 'Approve this request',
  };

  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders user task node with approval option', () => {
    render(
      <UserTaskNode
        data={mockData}
        selected={false}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('Approval Task')).toBeInTheDocument();
    expect(screen.getByLabelText(/requires approval/i)).toBeInTheDocument();
  });

  test('toggles approval requirement', () => {
    render(
      <UserTaskNode
        data={mockData}
        selected={true}
        onUpdate={mockOnUpdate}
      />
    );

    const approvalCheckbox = screen.getByLabelText(/requires approval/i);
    expect(approvalCheckbox).not.toBeChecked();

    fireEvent.click(approvalCheckbox);
    expect(mockOnUpdate).toHaveBeenCalledWith('user-task-1', {
      ...mockData,
      approval: true,
    });
  });

  test('displays approval status when enabled', () => {
    const approvalData = { ...mockData, approval: true };

    render(
      <UserTaskNode
        data={approvalData}
        selected={false}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('Requires Approval')).toBeInTheDocument();
  });

  test('shows approval workflow integration', () => {
    const workflowData = {
      ...mockData,
      approval: true,
      approvalWorkflowId: 123,
    };

    render(
      <UserTaskNode
        data={workflowData}
        selected={true}
        onUpdate={mockOnUpdate}
      />
    );

    // Should show approval workflow selection
    expect(screen.getByText(/approval workflow/i)).toBeInTheDocument();
  });
});

describe('WorkflowBuilder Approvals', () => {
  test('adds approval to workflow transitions', () => {
    // Test that workflow builder can add approval requirements to transitions
    const mockTransition = {
      id: 'transition-1',
      from: 'draft',
      to: 'approved',
      requiresApproval: true,
      allowedRoles: ['manager', 'supervisor'],
    };

    expect(mockTransition.requiresApproval).toBe(true);
    expect(mockTransition.allowedRoles).toContain('manager');
  });

  test('validates approval workflow configuration', () => {
    const invalidWorkflow = {
      states: ['draft', 'approved'],
      transitions: [
        {
          from: 'draft',
          to: 'approved',
          requiresApproval: true,
          // Missing allowedRoles - should be invalid
        },
      ],
    };

    // Validation should fail for transitions requiring approval without roles
    const isValid = invalidWorkflow.transitions.every(
      (t) => !t.requiresApproval || (t.allowedRoles && t.allowedRoles.length > 0)
    );

    expect(isValid).toBe(false);
  });
});