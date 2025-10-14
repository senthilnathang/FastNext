"use client";

import type { EChartsOption } from "echarts";
/**
 * Bar Chart Component
 * Reusable bar chart with common configurations
 */
import type React from "react";
import { useMemo } from "react";
import { BaseChart, type BaseChartProps } from "./BaseChart";

export interface BarChartData {
  name: string;
  data: number[];
  color?: string;
}

export interface BarChartProps extends Omit<BaseChartProps, "option"> {
  data: BarChartData[];
  xAxisData: string[];
  title?: string;
  subtitle?: string;
  legend?: boolean;
  horizontal?: boolean;
  stack?: boolean;
  grid?: {
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
  };
  yAxis?: {
    name?: string;
    min?: number | "dataMin";
    max?: number | "dataMax";
  };
  tooltip?: boolean;
  barWidth?: number | string;
  showValues?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  xAxisData,
  title,
  subtitle,
  legend = true,
  horizontal = false,
  stack = false,
  grid,
  yAxis,
  tooltip = true,
  barWidth,
  showValues = false,
  ...baseProps
}) => {
  const option: EChartsOption = useMemo(
    () => ({
      title: title
        ? {
            text: title,
            subtext: subtitle,
            left: "center",
          }
        : undefined,
      tooltip: tooltip
        ? {
            trigger: "axis",
            axisPointer: {
              type: "shadow",
            },
          }
        : undefined,
      legend: legend
        ? {
            data: data.map((d) => d.name),
            top: title ? 40 : 10,
            left: "center",
          }
        : undefined,
      grid: {
        top: grid?.top || (title ? 80 : legend ? 50 : 20),
        right: grid?.right || 20,
        bottom: grid?.bottom || 30,
        left: grid?.left || (horizontal ? 100 : 50),
        containLabel: true,
      },
      xAxis: horizontal
        ? {
            type: "value",
          }
        : {
            type: "category",
            data: xAxisData,
          },
      yAxis: horizontal
        ? {
            type: "category",
            data: xAxisData,
          }
        : {
            type: "value",
            name: yAxis?.name,
            min: yAxis?.min,
            max: yAxis?.max,
          },
      series: data.map((series) => ({
        name: series.name,
        type: "bar",
        data: series.data,
        barWidth: barWidth,
        itemStyle: series.color ? { color: series.color } : undefined,
        stack: stack ? "Total" : undefined,
        label: showValues
          ? {
              show: true,
              position: horizontal ? "right" : "top",
            }
          : undefined,
      })),
    }),
    [
      data,
      xAxisData,
      title,
      subtitle,
      legend,
      horizontal,
      stack,
      grid,
      yAxis,
      tooltip,
      barWidth,
      showValues,
    ],
  );

  return <BaseChart option={option} {...baseProps} />;
};

BarChart.displayName = "BarChart";
