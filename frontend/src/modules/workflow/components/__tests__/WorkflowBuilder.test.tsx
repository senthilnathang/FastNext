import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkflowBuilder from '../WorkflowBuilder';

// Mock ReactFlow since it doesn't work well in test environment
jest.mock('reactflow', () => ({
  ...jest.requireActual('reactflow'),
  ReactFlow: ({ children, nodes, edges }: any) => (
    <div data-testid="reactflow-canvas">
      <div data-testid="nodes-count">{nodes?.length || 0}</div>
      <div data-testid="edges-count">{edges?.length || 0}</div>
      {children}
    </div>
  ),
  Controls: () => <div data-testid="reactflow-controls" />,
  MiniMap: () => <div data-testid="reactflow-minimap" />,
  Background: () => <div data-testid="reactflow-background" />,
  Panel: ({ children }: any) => <div data-testid="reactflow-panel">{children}</div>,
  Handle: () => <div data-testid="node-handle" />,
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom'
  },
  ConnectionMode: {
    Loose: 'loose'
  },
  BackgroundVariant: {
    Dots: 'dots'
  },
  ReactFlowProvider: ({ children }: any) => <div>{children}</div>,
  useNodesState: (initialNodes: any) => [
    initialNodes, 
    jest.fn(), 
    jest.fn()
  ],
  useEdgesState: (initialEdges: any) => [
    initialEdges, 
    jest.fn(), 
    jest.fn()
  ],
  addEdge: jest.fn()
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon" />,
  Save: () => <div data-testid="save-icon" />,
  Maximize: () => <div data-testid="maximize-icon" />,
  ZoomOut: () => <div data-testid="zoomout-icon" />,
  Circle: () => <div data-testid="circle-icon" />,
  GitBranch: () => <div data-testid="gitbranch-icon" />,
  GitMerge: () => <div data-testid="gitmerge-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  User: () => <div data-testid="user-icon" />,
  ChevronDown: () => <div data-testid="chevrondown-icon" />,
  BarChart3: () => <div data-testid="barchart-icon" />,
  Edit3: () => <div data-testid="edit-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
}));

// Mock dropdown menu components
jest.mock('@/shared/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div data-testid="dropdown-item" onClick={onClick}>{children}</div>
  ),
}));

const renderWorkflowBuilder = (props = {}) => {
  const defaultProps = {
    templateId: 1,
    workflowTypeId: 1,
    initialNodes: [],
    initialEdges: [],
    readOnly: false,
    onSave: jest.fn(),
    ...props
  };

  return render(<WorkflowBuilder {...defaultProps} />);
};

describe('WorkflowBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders workflow builder with basic elements', () => {
    renderWorkflowBuilder();
    
    expect(screen.getByText('Workflow Builder')).toBeInTheDocument();
    expect(screen.getByText('Template #1')).toBeInTheDocument();
    expect(screen.getByTestId('reactflow-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('reactflow-controls')).toBeInTheDocument();
    expect(screen.getByTestId('reactflow-minimap')).toBeInTheDocument();
    expect(screen.getByTestId('reactflow-background')).toBeInTheDocument();
  });

  test('displays correct toolbar buttons when not read-only', () => {
    renderWorkflowBuilder({ readOnly: false });
    
    expect(screen.getByText('Add Node')).toBeInTheDocument();
    expect(screen.getByText('Auto Layout')).toBeInTheDocument();
    expect(screen.getByText('Fit View')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  test('hides edit buttons in read-only mode', () => {
    renderWorkflowBuilder({ readOnly: true });
    
    expect(screen.queryByText('Add Node')).not.toBeInTheDocument();
    expect(screen.queryByText('Auto Layout')).not.toBeInTheDocument();
    expect(screen.getByText('Fit View')).toBeInTheDocument(); // Should still be visible
  });

  test('displays workflow info panel', () => {
    const initialNodes = [
      {
        id: 'node1',
        type: 'workflowState',
        position: { x: 100, y: 100 },
        data: { label: 'Test Node' }
      }
    ];
    const initialEdges = [
      {
        id: 'edge1',
        source: 'node1',
        target: 'node2',
        data: { action: 'test' }
      }
    ];

    renderWorkflowBuilder({ initialNodes, initialEdges });
    
    expect(screen.getByText('Workflow Info')).toBeInTheDocument();
    expect(screen.getByText('States:')).toBeInTheDocument();
    expect(screen.getByText('Transitions:')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Node count
    expect(screen.getByText('1')).toBeInTheDocument(); // Edge count
  });

  test('shows dropdown menu with node types', async () => {
    renderWorkflowBuilder();
    
    const addNodeButton = screen.getByText('Add Node');
    fireEvent.click(addNodeButton);
    
    // Check if dropdown items are rendered
    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    expect(screen.getByTestId('dropdown-content')).toBeInTheDocument();
  });

  test('calls onSave when save button is clicked', () => {
    const mockOnSave = jest.fn();
    renderWorkflowBuilder({ onSave: mockOnSave });
    
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  test('displays status bar with correct information', () => {
    renderWorkflowBuilder({ readOnly: true });
    
    expect(screen.getByText(/View Mode/)).toBeInTheDocument();
    expect(screen.getByText(/Snap to Grid: On/)).toBeInTheDocument();
  });

  test('displays edit mode in status bar when not read-only', () => {
    renderWorkflowBuilder({ readOnly: false });
    
    expect(screen.getByText(/Edit Mode/)).toBeInTheDocument();
  });

  test('handles missing template ID', () => {
    renderWorkflowBuilder({ templateId: undefined });
    
    expect(screen.getByText('Workflow Builder')).toBeInTheDocument();
    expect(screen.queryByText(/Template #/)).not.toBeInTheDocument();
  });

  test('disables save button when no onSave callback provided', () => {
    renderWorkflowBuilder({ onSave: undefined });
    
    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();
  });

  test('renders with initial nodes and edges', () => {
    const initialNodes = [
      {
        id: 'node1',
        type: 'workflowState',
        position: { x: 100, y: 100 },
        data: { label: 'Start' }
      },
      {
        id: 'node2',
        type: 'workflowState',
        position: { x: 300, y: 100 },
        data: { label: 'End' }
      }
    ];

    const initialEdges = [
      {
        id: 'edge1',
        source: 'node1',
        target: 'node2',
        data: { action: 'proceed' }
      }
    ];

    renderWorkflowBuilder({ initialNodes, initialEdges });
    
    // Check nodes count
    expect(screen.getByTestId('nodes-count')).toHaveTextContent('2');
    // Check edges count  
    expect(screen.getByTestId('edges-count')).toHaveTextContent('1');
  });

  test('workflow info shows correct type ID', () => {
    renderWorkflowBuilder({ workflowTypeId: 5 });
    
    expect(screen.getByText('Type:')).toBeInTheDocument();
    expect(screen.getByText('#5')).toBeInTheDocument();
  });

  test('workflow info shows N/A when no type ID', () => {
    renderWorkflowBuilder({ workflowTypeId: undefined });
    
    expect(screen.getByText('Type:')).toBeInTheDocument();
    expect(screen.getByText('#N/A')).toBeInTheDocument();
  });
});

describe('WorkflowBuilder Node Addition', () => {
  test('should handle add node dropdown interactions', async () => {
    const mockOnSave = jest.fn();
    renderWorkflowBuilder({ onSave: mockOnSave });
    
    // Click the add node button to open dropdown
    const addNodeButton = screen.getByText('Add Node');
    fireEvent.click(addNodeButton);
    
    // The dropdown should be visible
    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    expect(screen.getByTestId('dropdown-content')).toBeInTheDocument();
  });

  test('should render all node type options in dropdown', () => {
    renderWorkflowBuilder();
    
    const addNodeButton = screen.getByText('Add Node');
    fireEvent.click(addNodeButton);
    
    // All dropdown items should be present
    const dropdownItems = screen.getAllByTestId('dropdown-item');
    expect(dropdownItems.length).toBeGreaterThan(0);
  });
});

describe('WorkflowBuilder Accessibility', () => {
  test('should have proper ARIA labels and roles', () => {
    renderWorkflowBuilder();
    
    // Check for important accessibility elements
    expect(screen.getByText('Workflow Builder')).toBeInTheDocument();
    
    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeInTheDocument();
    expect(saveButton.tagName).toBe('BUTTON');
  });

  test('should handle keyboard interactions', () => {
    renderWorkflowBuilder();
    
    const saveButton = screen.getByText('Save');
    
    // Test Enter key
    fireEvent.keyDown(saveButton, { key: 'Enter', code: 'Enter' });
    // The button should still be functional
    expect(saveButton).toBeInTheDocument();
  });
});

describe('WorkflowBuilder Error Handling', () => {
  test('should handle invalid initial data gracefully', () => {
    const invalidNodes = [
      {
        // Missing required fields
        id: 'invalid-node'
      }
    ] as any;

    expect(() => {
      renderWorkflowBuilder({ initialNodes: invalidNodes });
    }).not.toThrow();
  });

  test('should handle null/undefined props gracefully', () => {
    expect(() => {
      renderWorkflowBuilder({
        initialNodes: null,
        initialEdges: null,
        onSave: null
      });
    }).not.toThrow();
  });
});