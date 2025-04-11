// src/components/results/CategoryProgressChart.tsx
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";
import { CategoryProgressData, CustomTooltipProps } from "@/types/quiz";

export interface CategoryProgressChartProps {
  categoryData: CategoryProgressData[];
}

export const CategoryProgressChart = ({
  categoryData,
}: CategoryProgressChartProps) => {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // カスタムツールチップコンポーネント
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg max-w-xs text-sm">
          <p className="font-bold text-base mb-1">{label}</p>
          <p className="mb-1">
            正答率: <span className="font-semibold">{data.successRate}%</span> (
            {data.correctCount}/{data.totalAttempts}問)
          </p>
          <p className="text-gray-600 italic">{data.description}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mb-6 h-80 md:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={categoryData}
          margin={{
            top: 20,
            right: 10,
            left: -15,
            bottom: 55,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e0e0e0"
            vertical={false}
          />
          <XAxis
            dataKey="category"
            axisLine={{ stroke: "#d1d5db" }}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#4b5563" }}
            interval={0}
            angle={-45}
            textAnchor="end"
            dy={15}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            tick={{ fontSize: 10, fill: "#6b7280" }}
            width={45}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              fill: "rgba(239, 246, 255, 0.6)",
            }}
          />
          <Bar
            dataKey="successRate"
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
            onMouseEnter={(data) => setHoveredBar(data.category)}
            onMouseLeave={() => setHoveredBar(null)}
          >
            {categoryData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={hoveredBar === entry.category ? "#2563eb" : "#3b82f6"}
              />
            ))}
            <LabelList
              dataKey="successRate"
              position="top"
              formatter={(value: number) => (value > 0 ? `${value}%` : "")}
              fontSize={12}
              fill="#374151"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
