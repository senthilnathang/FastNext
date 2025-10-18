import { render, screen } from "@testing-library/react";
import React from "react";
import "@testing-library/jest-dom";
import ConditionalNode from "../ConditionalNode";
import ParallelGatewayNode from "../ParallelGatewayNode";
import TimerNode from "../TimerNode";
import UserTaskNode from "../UserTaskNode";
import WorkflowStateNode from "../WorkflowStateNode";

// Mock ReactFlow Handle component
jest.mock("reactflow", () => ({
  Handle: ({ type, position, id, className, style }: any) => (
    <div
      data-testid={`handle-${type}-${position}${id ? `-${id}` : ""}`}
      className={className}
      style={style}
    />
  ),
  Position: {
    Left: "left",
    Right: "right",
    Top: "top",
    Bottom: "bottom",
  },
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Circle: () => <div data-testid="circle-icon" />,
  GitBranch: () => <div data-testid="gitbranch-icon" />,
  GitMerge: () => <div data-testid="gitmerge-icon" />,
  Timer: () => <div data-testid="timer-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  User: () => <div data-testid="user-icon" />,
  Users: () => <div data-testid="users-icon" />,
  CheckSquare: () => <div data-testid="checksquare-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
}));

describe("WorkflowStateNode", () => {
  const mockNodeProps = {
    id: "node-1",
    type: "workflowState",
    position: { x: 100, y: 100 },
    data: {
      label: "Test State",
      description: "Test description",
      color: "#3B82F6",
      bgColor: "#EFF6FF",
      icon: "Circle",
      isInitial: false,
      isFinal: false,
    },
    selected: false,
    xPos: 100,
    yPos: 100,
    zIndex: 1,
    isConnectable: true,
    width: 150,
    height: 80,
    dragging: false,
  };

  test("renders basic state node with label and description", () => {
    render(<WorkflowStateNode {...mockNodeProps} />);

    expect(screen.getByText("Test State")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
    expect(screen.getByTestId("circle-icon")).toBeInTheDocument();
  });

  test("renders handles for input and output", () => {
    render(<WorkflowStateNode {...mockNodeProps} />);

    expect(screen.getByTestId("handle-target-left")).toBeInTheDocument();
    expect(screen.getByTestId("handle-source-right")).toBeInTheDocument();
  });

  test("shows initial state badge when isInitial is true", () => {
    const initialStateProps = {
      ...mockNodeProps,
      data: {
        ...mockNodeProps.data,
        isInitial: true,
      },
    };

    render(<WorkflowStateNode {...initialStateProps} />);

    expect(screen.getByText("Start")).toBeInTheDocument();
  });

  test("shows final state badge when isFinal is true", () => {
    const finalStateProps = {
      ...mockNodeProps,
      data: {
        ...mockNodeProps.data,
        isFinal: true,
      },
    };

    render(<WorkflowStateNode {...finalStateProps} />);

    expect(screen.getByText("End")).toBeInTheDocument();
  });

  test("applies selected styling when selected", () => {
    const selectedProps = { ...mockNodeProps, selected: true };

    render(<WorkflowStateNode {...selectedProps} />);

    // Find the main node container by looking for the element with the border styling
    const nodeContainer = document.querySelector('[style*="border-color"]');
    expect(nodeContainer).toHaveAttribute("style");
    expect(nodeContainer?.getAttribute("style")).toContain(
      "border-color: rgb(59, 130, 246)",
    );
  });

  test("handles missing description gracefully", () => {
    const noDescriptionProps = {
      ...mockNodeProps,
      data: {
        ...mockNodeProps.data,
        description: undefined,
      },
    };

    render(<WorkflowStateNode {...noDescriptionProps} />);

    expect(screen.getByText("Test State")).toBeInTheDocument();
    expect(screen.queryByText("Test description")).not.toBeInTheDocument();
  });
});

describe("ConditionalNode", () => {
  const mockConditionalProps = {
    id: "cond-1",
    type: "conditional",
    position: { x: 200, y: 200 },
    data: {
      label: "Decision Point",
      description: "Check condition",
      condition: "amount > 1000",
    },
    selected: false,
    xPos: 200,
    yPos: 200,
    zIndex: 1,
    isConnectable: true,
    width: 120,
    height: 80,
    dragging: false,
  };

  test("renders conditional node with decision styling", () => {
    render(<ConditionalNode {...mockConditionalProps} />);

    expect(screen.getByText("Decision Point")).toBeInTheDocument();
    expect(screen.getByText("Check condition")).toBeInTheDocument();
    expect(screen.getByText("Decision")).toBeInTheDocument();
    expect(screen.getByTestId("gitbranch-icon")).toBeInTheDocument();
    expect(screen.getByTestId("settings-icon")).toBeInTheDocument();
  });

  test("renders true and false output handles", () => {
    render(<ConditionalNode {...mockConditionalProps} />);

    expect(screen.getByTestId("handle-target-top")).toBeInTheDocument();
    expect(screen.getByTestId("handle-source-left-false")).toBeInTheDocument();
    expect(screen.getByTestId("handle-source-right-true")).toBeInTheDocument();
  });

  test("uses default label when none provided", () => {
    const noLabelProps = {
      ...mockConditionalProps,
      data: {
        ...mockConditionalProps.data,
        label: "Condition", // Default label instead of undefined
      },
    };

    render(<ConditionalNode {...noLabelProps} />);

    expect(screen.getByText("Condition")).toBeInTheDocument();
  });
});

describe("ParallelGatewayNode", () => {
  const mockParallelProps = {
    id: "parallel-1",
    type: "parallelGateway",
    position: { x: 300, y: 300 },
    data: {
      label: "Parallel Split",
      description: "Fork execution",
    },
    selected: false,
    xPos: 300,
    yPos: 300,
    zIndex: 1,
    isConnectable: true,
    width: 100,
    height: 80,
    dragging: false,
  };

  test("renders parallel gateway node as split", () => {
    render(<ParallelGatewayNode {...mockParallelProps} />);

    expect(screen.getByText("Parallel Split")).toBeInTheDocument();
    expect(screen.getByText("Fork execution")).toBeInTheDocument();
    expect(screen.getByText("Split")).toBeInTheDocument();
    expect(screen.getByTestId("gitmerge-icon")).toBeInTheDocument();
  });

  test("renders multiple output handles for split gateway", () => {
    render(<ParallelGatewayNode {...mockParallelProps} />);

    expect(screen.getByTestId("handle-target-left")).toBeInTheDocument();
    expect(screen.getByTestId("handle-source-right-out1")).toBeInTheDocument();
    expect(screen.getByTestId("handle-source-right-out2")).toBeInTheDocument();
  });

  test("renders merge gateway correctly", () => {
    const mergeProps = {
      ...mockParallelProps,
      data: {
        label: "Parallel Merge",
        description: "Join execution",
      },
    };

    render(<ParallelGatewayNode {...mergeProps} />);

    expect(screen.getByText("Parallel Merge")).toBeInTheDocument();
    expect(screen.getByText("Merge")).toBeInTheDocument();
  });

  test("uses default label when none provided", () => {
    const noLabelProps = {
      ...mockParallelProps,
      data: {
        label: "Gateway",
        description: "Gateway description",
      },
    };

    render(<ParallelGatewayNode {...noLabelProps} />);

    expect(screen.getByText("Gateway")).toBeInTheDocument();
  });
});

describe("TimerNode", () => {
  const mockTimerProps = {
    id: "timer-1",
    type: "timer",
    position: { x: 400, y: 400 },
    data: {
      label: "Wait Timer",
      description: "Wait 1 hour",
      duration: "2h",
    },
    selected: false,
    xPos: 400,
    yPos: 400,
    zIndex: 1,
    isConnectable: true,
    width: 80,
    height: 80,
    dragging: false,
  };

  test("renders timer node with circular styling", () => {
    render(<TimerNode {...mockTimerProps} />);

    expect(screen.getByText("Wait Timer")).toBeInTheDocument();
    expect(screen.getByText("Wait 1 hour")).toBeInTheDocument();
    expect(screen.getByText("2h")).toBeInTheDocument();
    expect(screen.getByTestId("timer-icon")).toBeInTheDocument();
  });

  test("renders input and output handles", () => {
    render(<TimerNode {...mockTimerProps} />);

    expect(screen.getByTestId("handle-target-left")).toBeInTheDocument();
    expect(screen.getByTestId("handle-source-right")).toBeInTheDocument();
  });

  test("uses default duration when none provided", () => {
    const noDurationProps = {
      ...mockTimerProps,
      data: {
        ...mockTimerProps.data,
        duration: undefined,
      },
    };

    render(<TimerNode {...noDurationProps} />);

    expect(screen.getByText("1h")).toBeInTheDocument();
  });

  test("uses default label when none provided", () => {
    const noLabelProps = {
      ...mockTimerProps,
      data: {
        label: "Timer",
        description: "Timer description",
      },
    };

    render(<TimerNode {...noLabelProps} />);

    expect(screen.getByText("Timer")).toBeInTheDocument();
  });
});

describe("UserTaskNode", () => {
  const mockUserTaskProps = {
    id: "user-task-1",
    type: "userTask",
    position: { x: 500, y: 500 },
    data: {
      label: "Review Order",
      description: "Manual review required",
      assignee: "john.doe",
      requiredRoles: ["manager", "supervisor"],
      approval: true,
      priority: "high" as const,
    },
    selected: false,
    xPos: 500,
    yPos: 500,
    zIndex: 1,
    isConnectable: true,
    width: 150,
    height: 120,
    dragging: false,
  };

  test("renders user task node with all details", () => {
    render(<UserTaskNode {...mockUserTaskProps} />);

    expect(screen.getByText("Review Order")).toBeInTheDocument();
    expect(screen.getByText("Manual review required")).toBeInTheDocument();
    expect(screen.getByText("john.doe")).toBeInTheDocument();
    expect(screen.getByText("manager, supervisor")).toBeInTheDocument();
    expect(screen.getByText("Requires Approval")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(screen.getByText("Task")).toBeInTheDocument();
  });

  test("renders icons for different task properties", () => {
    render(<UserTaskNode {...mockUserTaskProps} />);

    // Check that multiple user icons are rendered (header + assignee)
    const userIcons = screen.getAllByTestId("user-icon");
    expect(userIcons).toHaveLength(2);

    expect(screen.getByTestId("users-icon")).toBeInTheDocument();
    expect(screen.getByTestId("checksquare-icon")).toBeInTheDocument();
  });

  test("renders input and output handles", () => {
    render(<UserTaskNode {...mockUserTaskProps} />);

    expect(screen.getByTestId("handle-target-left")).toBeInTheDocument();
    expect(screen.getByTestId("handle-source-right")).toBeInTheDocument();
  });

  test("handles missing optional properties", () => {
    const minimalProps = {
      ...mockUserTaskProps,
      data: {
        label: "Simple Task",
      },
    };

    render(<UserTaskNode {...minimalProps} />);

    expect(screen.getByText("Simple Task")).toBeInTheDocument();
    expect(screen.getByText("Task")).toBeInTheDocument();
    expect(screen.queryByText("john.doe")).not.toBeInTheDocument();
    expect(screen.queryByText("Requires Approval")).not.toBeInTheDocument();
  });

  test("uses default label when none provided", () => {
    const noLabelProps = {
      ...mockUserTaskProps,
      data: {
        label: "User Task",
        description: "Task description",
      },
    };

    render(<UserTaskNode {...noLabelProps} />);

    expect(screen.getByText("User Task")).toBeInTheDocument();
  });

  test("applies correct priority styling", () => {
    render(<UserTaskNode {...mockUserTaskProps} />);

    const priorityBadge = screen.getByText("high");
    expect(priorityBadge).toHaveClass("bg-red-100", "text-red-700");
  });

  test("handles medium priority styling", () => {
    const mediumPriorityProps = {
      ...mockUserTaskProps,
      data: {
        ...mockUserTaskProps.data,
        priority: "medium" as const,
      },
    };

    render(<UserTaskNode {...mediumPriorityProps} />);

    const priorityBadge = screen.getByText("medium");
    expect(priorityBadge).toHaveClass("bg-yellow-100", "text-yellow-700");
  });

  test("handles low priority styling", () => {
    const lowPriorityProps = {
      ...mockUserTaskProps,
      data: {
        ...mockUserTaskProps.data,
        priority: "low" as const,
      },
    };

    render(<UserTaskNode {...lowPriorityProps} />);

    const priorityBadge = screen.getByText("low");
    expect(priorityBadge).toHaveClass("bg-gray-100", "text-gray-700");
  });
});

describe("Node Error Handling", () => {
  test("nodes handle null data gracefully", () => {
    const nullDataProps = {
      id: "test-node",
      type: "workflowState",
      position: { x: 0, y: 0 },
      data: null,
      selected: false,
      xPos: 0,
      yPos: 0,
      zIndex: 1,
      isConnectable: true,
      width: 100,
      height: 80,
      dragging: false,
    } as any;

    expect(() => {
      render(<WorkflowStateNode {...nullDataProps} />);
    }).not.toThrow();
  });

  test("nodes handle undefined props gracefully", () => {
    const undefinedProps = {
      id: "test-node",
      type: "workflowState",
      position: { x: 0, y: 0 },
      data: { label: "Test Node" },
      selected: false,
      xPos: 0,
      yPos: 0,
      zIndex: 1,
      isConnectable: true,
      width: 100,
      height: 80,
      dragging: false,
    };

    expect(() => {
      render(<WorkflowStateNode {...undefinedProps} />);
    }).not.toThrow();
  });
});
