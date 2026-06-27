import { CalendarDays } from "lucide-react";
import { useGantt } from "../hooks/useGantt";
import { GanttHeader } from "../components/gantt/GanttHeader";
import { GanttLabelPanel } from "../components/gantt/GanttLabelPanel";
import { GanttChart } from "../components/gantt/GanttChart";
import { GanttTasksWithoutDates } from "../components/gantt/GanttTasksWithoutDates";

export function GanttPage() {
  const {
    activeProjectId,
    activeProject,
    loading,
    pxIdx,
    setPxIdx,
    showMilestones,
    setShowMilestones,
    scrollRef,
    pxPerDay,
    minDate,
    svgWidth,
    svgHeight,
    monthHeaders,
    todayX,
    allRows,
    tasksWithoutDates,
    scrollToToday,
  } = useGantt();

  if (!activeProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <CalendarDays className="size-12 mb-3 opacity-40" />
        <p className="text-lg font-medium">Nenhum projeto selecionado</p>
        <p className="text-sm mt-1">Selecione um projeto para ver o Gantt</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <GanttHeader
        projectName={activeProject?.name}
        activeProjectId={activeProjectId}
        pxIdx={pxIdx}
        setPxIdx={setPxIdx}
        showMilestones={showMilestones}
        setShowMilestones={setShowMilestones}
        scrollToToday={scrollToToday}
      />

      {loading && (
        <div className="flex items-center justify-center h-32 text-slate-500">
          <div className="animate-spin size-6 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
          A carregar...
        </div>
      )}

      {!loading && allRows.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-slate-500 border border-dashed border-slate-200 rounded-lg">
          <CalendarDays className="size-10 mb-2 opacity-40" />
          <p className="font-medium">Sem tarefas ou marcos com datas</p>
          <p className="text-sm mt-1">Adicione datas às tarefas para visualizá-las aqui</p>
        </div>
      )}

      {!loading && allRows.length > 0 && (
        <div className="flex border border-slate-200 rounded-lg overflow-hidden flex-1 min-h-0">
          <GanttLabelPanel allRows={allRows} />
          <GanttChart
            scrollRef={scrollRef}
            allRows={allRows}
            svgWidth={svgWidth}
            svgHeight={svgHeight}
            monthHeaders={monthHeaders}
            minDate={minDate}
            pxPerDay={pxPerDay}
            todayX={todayX}
          />
        </div>
      )}

      <GanttTasksWithoutDates tasks={tasksWithoutDates} />
    </div>
  );
}
