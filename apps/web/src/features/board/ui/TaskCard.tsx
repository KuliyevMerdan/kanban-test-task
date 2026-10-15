'use client';

import { type Task, TASK_STATUSES, type TaskStatus } from '@kanban/shared';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type KeyboardEvent, type SyntheticEvent, useState } from 'react';
import { STATUS_LABELS } from '@/entities/task/labels';
import { PriorityChip } from '@/entities/task/ui/PriorityChip';

export interface TaskCardActions {
  onOpen: (task: Task) => void;
  onMove: (task: Task, status: TaskStatus) => void;
  onDelete: (task: Task) => void;
}

const clampLines = (lines: number) => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'break-word',
});

/** Card in a column: draggable, opens on click / Enter, has an actions menu. */
export function SortableTaskCard({ task, ...actions }: { task: Task } & TaskCardActions) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const onKeyDown = (event: KeyboardEvent) => {
    // Space picks the card up (dnd-kit), Enter opens it (or drops it while dragging).
    if (event.key === 'Enter' && !isDragging) actions.onOpen(task);
    else listeners?.onKeyDown?.(event);
  };

  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onKeyDown={onKeyDown}
      onClick={() => actions.onOpen(task)}
      aria-label={`Задача «${task.title}». Enter — открыть, пробел — перетащить`}
      sx={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        borderRadius: 1,
        cursor: 'grab',
        touchAction: 'manipulation',
        '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineStyle: 'solid' },
      }}
    >
      <TaskCardView task={task} actions={actions} />
    </Box>
  );
}

export function TaskCardView({
  task,
  actions,
  lifted = false,
}: {
  task: Task;
  actions?: TaskCardActions;
  /** Rendered in the drag overlay. */
  lifted?: boolean;
}) {
  return (
    <Card
      variant={lifted ? 'elevation' : 'outlined'}
      elevation={lifted ? 8 : 0}
      sx={{
        p: 1.5,
        transform: lifted ? 'rotate(2deg)' : undefined,
        cursor: lifted ? 'grabbing' : undefined,
        '&:hover': { borderColor: 'primary.light' },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Typography sx={{ flex: 1, fontWeight: 500, ...clampLines(3) }}>{task.title}</Typography>
        {actions && <TaskMenu task={task} actions={actions} />}
      </Stack>
      {task.description && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, ...clampLines(2) }}>
          {task.description}
        </Typography>
      )}
      <Box sx={{ mt: 1 }}>
        <PriorityChip priority={task.priority} />
      </Box>
    </Card>
  );
}

function TaskMenu({ task, actions }: { task: Task; actions: TaskCardActions }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  const run = (action: () => void) => () => {
    close();
    action();
  };
  // Keep clicks / key presses on the menu from opening the card or starting a drag.
  const stop = (event: SyntheticEvent) => event.stopPropagation();

  return (
    <Box onClick={stop} onMouseDown={stop} onTouchStart={stop} onKeyDown={stop}>
      <IconButton
        size="small"
        aria-label={`Действия с задачей «${task.title}»`}
        aria-haspopup="menu"
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ mt: -0.5, mr: -0.5 }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem onClick={run(() => actions.onOpen(task))}>
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Открыть
        </MenuItem>
        <Divider />
        <ListSubheader sx={{ lineHeight: 2.5 }}>Переместить в</ListSubheader>
        {TASK_STATUSES.filter((status) => status !== task.status).map((status) => (
          <MenuItem key={status} onClick={run(() => actions.onMove(task, status))}>
            <ListItemIcon>
              <SwapHorizIcon fontSize="small" />
            </ListItemIcon>
            {STATUS_LABELS[status]}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={run(() => actions.onDelete(task))} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteOutlinedIcon fontSize="small" color="error" />
          </ListItemIcon>
          Удалить
        </MenuItem>
      </Menu>
    </Box>
  );
}
