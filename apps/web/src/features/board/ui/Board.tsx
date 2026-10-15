'use client';

import { type Task, TASK_STATUSES, type TaskStatus } from '@kanban/shared';
import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useMemo, useState } from 'react';
import { useMoveTask } from '@/entities/task/hooks';
import { STATUS_LABELS } from '@/entities/task/labels';
import { groupByStatus } from '@/entities/task/model';
import { errorMessage } from '@/shared/api/http';
import { useNotify } from '@/shared/ui/notifications';
import { type ColumnIds, moveAcrossColumns, resolveDrop, toColumnIds } from '../lib/dnd';
import { BoardColumn } from './BoardColumn';
import { type TaskCardActions, TaskCardView } from './TaskCard';

interface BoardProps extends Omit<TaskCardActions, 'onMove'> {
  tasks: Task[];
  isMobile: boolean;
  /** Column shown on phones (one column at a time, switched by tabs). */
  mobileStatus: TaskStatus;
  onMobileStatusChange: (status: TaskStatus) => void;
  onCreate: (status: TaskStatus) => void;
}

export function Board({
  tasks,
  isMobile,
  mobileStatus,
  onMobileStatusChange,
  onCreate,
  ...actions
}: BoardProps) {
  const moveTask = useMoveTask();
  const notify = useNotify();

  const columns = useMemo(() => groupByStatus(tasks), [tasks]);
  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  // While dragging, the board renders this preview instead of the server order.
  const [drag, setDrag] = useState<{
    activeId: string;
    original: ColumnIds;
    preview: ColumnIds;
  } | null>(null);
  const columnIds = drag?.preview ?? toColumnIds(columns);

  const sensors = useSensors(
    // A few pixels of movement before a drag starts, so a click still opens the card.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long press on touch screens, so swiping still scrolls the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  );

  const move = (task: Task, input: Parameters<typeof moveTask.mutate>[0]['input']) =>
    moveTask.mutate(
      { id: task.id, input },
      { onError: (error) => notify({ message: errorMessage(error), severity: 'error' }) },
    );

  const onDragStart = ({ active }: DragStartEvent) => {
    const ids = toColumnIds(columns);
    setDrag({ activeId: String(active.id), original: ids, preview: ids });
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!drag || !over) return;
    const preview = moveAcrossColumns(drag.preview, String(active.id), String(over.id));
    if (preview) setDrag({ ...drag, preview });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const current = drag;
    setDrag(null);
    if (!current || !over) return;

    const task = tasksById.get(String(active.id));
    const input = resolveDrop(
      current.original,
      current.preview,
      String(active.id),
      String(over.id),
    );
    if (task && input) move(task, input);
  };

  const cardActions: TaskCardActions = {
    ...actions,
    // From the menu: put the task on top of the target column, where it's easy to spot.
    onMove: (task, status) => {
      move(task, { status, afterId: null });
      notify({ message: `Задача перемещена в «${STATUS_LABELS[status]}»`, severity: 'success' });
    },
  };

  const activeTask = drag ? tasksById.get(drag.activeId) : undefined;
  const visibleStatuses = isMobile ? [mobileStatus] : TASK_STATUSES;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDrag(null)}
    >
      {isMobile && (
        <Tabs
          value={mobileStatus}
          onChange={(_, status: TaskStatus) => onMobileStatusChange(status)}
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          {TASK_STATUSES.map((status) => (
            <Tab
              key={status}
              value={status}
              label={`${STATUS_LABELS[status]} · ${columns[status].length}`}
              sx={{ textTransform: 'none', whiteSpace: 'nowrap', minWidth: 0, px: 1 }}
            />
          ))}
        </Tabs>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
          gap: 2,
          alignItems: 'start',
        }}
      >
        {visibleStatuses.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tasks={columnIds[status].flatMap((id) => tasksById.get(id) ?? [])}
            showHeader={!isMobile}
            onCreate={onCreate}
            {...cardActions}
          />
        ))}
      </Box>

      <DragOverlay>{activeTask ? <TaskCardView task={activeTask} lifted /> : null}</DragOverlay>
    </DndContext>
  );
}
