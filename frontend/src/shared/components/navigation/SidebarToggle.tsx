"use client";

import { PanelLeft, PanelLeftClose } from "lucide-react";
import { cn } from "@/shared/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface SidebarToggleProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
  variant?: "default" | "minimal" | "floating";
  size?: "sm" | "md" | "lg";
}

export default function SidebarToggle({
  isCollapsed,
  onToggle,
  className,
  variant = "default",
  size = "md",
}: SidebarToggleProps) {
  const sizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5",
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const variantClasses = {
    default: "bg-card border border-border shadow-sm hover:shadow-md",
    minimal: "bg-transparent hover:bg-accent",
    floating: "bg-card border border-border shadow-lg hover:shadow-xl",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onToggle}
            className={cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              "hover:bg-accent hover:text-accent-foreground",
              "h-10 w-10",
              className,
            )}
            disabled={disabled}
            aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isCollapsed ? (
              <PanelLeft
                className={cn(
                  iconSizes[size],
                  "transition-transform group-hover:scale-110",
                )}
              />
            ) : (
              <PanelLeftClose
                className={cn(
                  iconSizes[size],
                  "transition-transform group-hover:scale-110",
                )}
              />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p>{isCollapsed ? "Expand sidebar" : "Collapse sidebar"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ctrl+B</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
