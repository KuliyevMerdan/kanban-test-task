'use client';

import { type Task, type TaskStatus } from '@kanban/shared';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { STATUS_COLORS, STATUS_LABELS } from '@/entities/task/labels';
import { SortableTaskCard, type TaskCardActions } from './TaskCard';

interface BoardColumnProps extends TaskCardActions {
  status: TaskStatus;
  tasks: Task[];
  /** On phones the column name is already in the tabs. */
  showHeader: boolean;
  onCreate: (status: TaskStatus) => void;
}

export function BoardColumn({ status, tasks, showHeader, onCreate, ...actions }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const label = STATUS_LABELS[status];
  const headingId = `column-${status}`;

  return (
    <Box
      component="section"
      aria-labelledby={showHeader ? headingId : undefined}
      aria-label={showHeader ? undefined : label}
      sx={{
        bgcolor: 'action.hover',
        borderRadius: 2,
        borderTop: 3,
        borderColor: `${STATUS_COLORS[status]}.main`,
        p: 1.5,
      }}
    >
      {showHeader && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
          <Typography id={headingId} component="h2" variant="subtitle1" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>
          <Chip size="small" label={tasks.length} aria-label={`${tasks.length} задач`} />
          <Box sx={{ flex: 1 }} />
          <IconButton
            size="small"
            aria-label={`Добавить задачу в «${label}»`}
            onClick={() => onCreate(status)}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Stack>
      )}

      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <Stack ref={setNodeRef} spacing={1} sx={{ minHeight: 96 }}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} {...actions} />
          ))}
          {tasks.length === 0 && (
            <Box
              sx={{
                flex: 1,
                minHeight: 96,
                display: 'grid',
                placeItems: 'center',
                border: 2,
                borderStyle: 'dashed',
                borderColor: isOver ? 'primary.main' : 'divider',
                borderRadius: 2,
                color: 'text.secondary',
                typography: 'body2',
                textAlign: 'center',
                px: 2,
              }}
            >
              {showHeader ? 'Перетащите задачу сюда' : 'В этой колонке пока нет задач'}
            </Box>
          )}
        </Stack>
      </SortableContext>
    </Box>
  );
}
