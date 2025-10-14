"use client";

import type { EChartsOption } from "echarts";
/**
 * Pie Chart Component
 * Reusable pie/donut chart with common configurations
 */
import type React from "react";
import { useMemo } from "react";
import { BaseChart, type BaseChartProps } from "./BaseChart";

export interface PieChartData {
  name: string;
  value: number;
  color?: string;
}

export interface PieChartProps extends Omit<BaseChartProps, "option"> {
  data: PieChartData[];
  title?: string;
  subtitle?: string;
  legend?: boolean;
  donut?: boolean;
  donutRadius?: [string, string];
  radius?: string | [string, string];
  center?: [string, string];
  roseType?: boolean;
  showLabel?: boolean;
  labelPosition?: "inside" | "outside";
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  subtitle,
  legend = true,
  donut = false,
  donutRadius = ["40%", "70%"],
  radius = "70%",
  center = ["50%", "50%"],
  roseType = false,
  showLabel = true,
  labelPosition = "outside",
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
      tooltip: {
        trigger: "item",
        formatter: "{a} <br/>{b}: {c} ({d}%)",
      },
      legend: legend
        ? {
            orient: "vertical",
            left: "left",
            top: title ? 60 : 20,
          }
        : undefined,
      series: [
        {
          name: title || "Data",
          type: "pie",
          radius: donut ? donutRadius : radius,
          center: center,
          roseType: roseType ? "radius" : undefined,
          data: data.map((item) => ({
            value: item.value,
            name: item.name,
            itemStyle: item.color ? { color: item.color } : undefined,
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
          label: {
            show: showLabel,
            position: labelPosition,
          },
        },
      ],
    }),
    [
      data,
      title,
      subtitle,
      legend,
      donut,
      donutRadius,
      radius,
      center,
      roseType,
      showLabel,
      labelPosition,
    ],
  );

  return <BaseChart option={option} {...baseProps} />;
};

PieChart.displayName = "PieChart";
