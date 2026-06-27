import { RefObject } from "react";
import {
  GanttRow,
  ROW_HEIGHT,
  HEADER_HEIGHT,
  parseDate,
  addDays,
  diffDays,
  statusColor,
  milestoneColor,
} from "./gantt.types";

interface MonthHeader {
  label: string;
  x: number;
  width: number;
}

interface GanttChartProps {
  scrollRef: RefObject<HTMLDivElement>;
  allRows: GanttRow[];
  svgWidth: number;
  svgHeight: number;
  monthHeaders: MonthHeader[];
  minDate: Date;
  pxPerDay: number;
  todayX: number;
}

export function GanttChart({
  scrollRef,
  allRows,
  svgWidth,
  svgHeight,
  monthHeaders,
  minDate,
  pxPerDay,
  todayX,
}: GanttChartProps) {
  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden" ref={scrollRef}>
      <svg
        width={svgWidth}
        height={HEADER_HEIGHT + svgHeight}
        style={{ display: "block" }}
      >
        {allRows.map((_, i) => (
          <rect
            key={i}
            x={0}
            y={HEADER_HEIGHT + i * ROW_HEIGHT}
            width={svgWidth}
            height={ROW_HEIGHT}
            fill={i % 2 === 0 ? "#ffffff" : "#f8fafc"}
          />
        ))}

        <rect x={0} y={0} width={svgWidth} height={HEADER_HEIGHT} fill="#f1f5f9" />

        {monthHeaders.map((h, i) => (
          <g key={i}>
            <line x1={h.x} y1={0} x2={h.x} y2={HEADER_HEIGHT + svgHeight} stroke="#e2e8f0" strokeWidth={1} />
            <text
              x={h.x + h.width / 2}
              y={HEADER_HEIGHT / 2 + 5}
              textAnchor="middle"
              fontSize={11}
              fill="#64748b"
              fontWeight="600"
            >
              {h.label}
            </text>
          </g>
        ))}

        {allRows.map((_, i) => (
          <line
            key={i}
            x1={0}
            y1={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
            x2={svgWidth}
            y2={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
            stroke="#f1f5f9"
            strokeWidth={1}
          />
        ))}

        {allRows.map((row, i) => {
          const y = HEADER_HEIGHT + i * ROW_HEIGHT;
          const cy = y + ROW_HEIGHT / 2;

          if (row.type === "task") {
            const task = row.item;
            const endDate = parseDate(task.data_fim);
            if (!endDate) return null;
            const startDate = parseDate(task.data_inicio) ?? addDays(endDate, -7);
            const x1 = Math.max(0, diffDays(minDate, startDate) * pxPerDay);
            const x2 = diffDays(minDate, endDate) * pxPerDay;
            const barW = Math.max(4, x2 - x1);
            const color = statusColor(task.status);

            return (
              <g key={`task-${task.id}`}>
                <rect
                  x={x1}
                  y={cy - ROW_HEIGHT * 0.3}
                  width={barW}
                  height={ROW_HEIGHT * 0.6}
                  rx={3}
                  fill={color}
                  opacity={0.85}
                />
                {barW > 40 && task.responsavel && (
                  <text
                    x={x1 + 4}
                    y={cy + 4}
                    fontSize={9}
                    fill="white"
                    fontWeight="500"
                  >
                    {task.responsavel.split(" ")[0]}
                  </text>
                )}
              </g>
            );
          } else {
            const ms = row.item;
            const d = parseDate(ms.data_prevista);
            if (!d) return null;
            const cx = diffDays(minDate, d) * pxPerDay;
            const size = 8;
            const color = milestoneColor(ms.estado);

            return (
              <g key={`ms-${ms.id}`}>
                <polygon
                  points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
                  fill={color}
                  opacity={0.9}
                />
              </g>
            );
          }
        })}

        {todayX >= 0 && todayX <= svgWidth && (
          <g>
            <line
              x1={todayX}
              y1={0}
              x2={todayX}
              y2={HEADER_HEIGHT + svgHeight}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
            <text x={todayX + 3} y={14} fontSize={9} fill="#ef4444" fontWeight="600">
              Hoje
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
