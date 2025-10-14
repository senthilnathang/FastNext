"use client";

/**
 * Area Chart Component
 * Reusable area chart (line chart with filled area)
 */
import type React from "react";
import { LineChart, type LineChartProps } from "./LineChart";

export interface AreaChartProps extends Omit<LineChartProps, "data"> {
  data: Omit<LineChartProps["data"][0], "areaStyle">[];
}

export const AreaChart: React.FC<AreaChartProps> = ({ data, ...props }) => {
  // Convert data to include areaStyle
  const areaData = data.map((series) => ({
    ...series,
    areaStyle: true,
  }));

  return <LineChart data={areaData} {...props} />;
};

AreaChart.displayName = "AreaChart";
