import { type TaskPriority } from '@kanban/shared';
import Chip from '@mui/material/Chip';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../labels';

export function PriorityChip({ priority }: { priority: TaskPriority }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      color={PRIORITY_COLORS[priority]}
      label={PRIORITY_LABELS[priority]}
      aria-label={`Приоритет: ${PRIORITY_LABELS[priority]}`}
    />
  );
}
