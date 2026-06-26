import { Badge } from "../ui/badge";
import { AlertCircle } from "lucide-react";

interface KanbanColumnProps {
  title: string;
  count: number;
  wipLimit?: number;
  color: "gray" | "blue" | "green";
  children: React.ReactNode;
  isOver?: boolean;
}

const bgColors = {
  gray: "bg-gray-50",
  blue: "bg-blue-50/50",
  green: "bg-green-50/50",
};

const headerColors = {
  gray: "bg-gray-100",
  blue: "bg-blue-100",
  green: "bg-green-100",
};

const textColors = {
  gray: "text-gray-700",
  blue: "text-blue-700",
  green: "text-green-700",
};

export function KanbanColumn({
  title,
  count,
  wipLimit,
  color,
  children,
  isOver,
}: KanbanColumnProps) {
  const isOverLimit = wipLimit !== undefined && count >= wipLimit;

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className={`${headerColors[color]} rounded-t-lg p-4 border-b-2 border-gray-200`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold ${textColors[color]} uppercase text-sm`}>
              {title}
            </h3>
            <Badge variant="secondary" className="rounded-full">
              {count}
            </Badge>
          </div>
          {wipLimit !== undefined && (
            <div className="flex items-center gap-1 text-xs">
              {isOverLimit && <AlertCircle className="size-4 text-red-500" />}
              <span className={isOverLimit ? "text-red-600 font-semibold" : "text-gray-500"}>
                Max: {wipLimit}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className={`flex-1 ${bgColors[color]} rounded-b-lg p-4 transition-all ${
          isOver ? "ring-2 ring-blue-400 ring-offset-2 bg-blue-100/50" : ""
        } ${isOverLimit ? "opacity-75" : ""}`}
      >
        <div className="space-y-3 min-h-[200px]">
          {children}
          {isOverLimit && (
            <div className="text-center py-4 text-sm text-red-600 font-medium">
              ⚠️ Coluna sobrecarregada!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
