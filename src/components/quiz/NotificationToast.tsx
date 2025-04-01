// src/components/quiz/NotificationToast.tsx
import React from "react";
import { Clock } from "lucide-react";
import { NotificationLevel } from "@/types/quiz"; // パスを調整

interface NotificationToastProps {
  message: string;
  level: NotificationLevel;
  colorClass: string; // getTimerColorの結果を受け取る
  show: boolean;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  message,
  level,
  colorClass,
  show,
}) => {
  if (!show) return null;

  const borderColorClass =
    level === "critical"
      ? "border-red-600"
      : level === "warning"
      ? "border-orange-500"
      : level === "notice"
      ? "border-yellow-500"
      : "border-gray-300";

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center p-3 pr-4 rounded-lg shadow-lg border-l-4 bg-white
            ${borderColorClass}
            animate-slideInFromRight`} // アニメーションクラス（必要ならCSS定義）
    >
      <Clock size={20} className={colorClass} />
      <span className="ml-2 font-medium">{message}</span>
    </div>
  );
};

export default NotificationToast;
