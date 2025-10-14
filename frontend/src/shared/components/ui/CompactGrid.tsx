"use client";

import type React from "react";
import { cn } from "@/shared/utils";

interface CompactGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: "xs" | "sm" | "md" | "lg";
  className?: string;
  responsive?: boolean;
}

export default function CompactGrid({
  children,
  cols = 3,
  gap = "sm",
  className,
  responsive = true,
}: CompactGridProps) {
  const colClasses = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };

  const gapClasses = {
    xs: "gap-2",
    sm: "gap-3",
    md: "gap-4",
    lg: "gap-6",
  };

  const responsiveClasses = responsive
    ? {
        1: "grid-cols-1",
        2: "grid-cols-1 md:grid-cols-2",
        3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        5: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
        6: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6",
      }
    : colClasses;

  return (
    <div
      className={cn(
        "grid",
        responsive ? responsiveClasses[cols] : colClasses[cols],
        gapClasses[gap],
        className,
      )}
    >
      {children}
    </div>
  );
}
