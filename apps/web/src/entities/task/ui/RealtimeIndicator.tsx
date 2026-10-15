import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { type RealtimeStatus } from '../realtime';

const VIEW: Record<RealtimeStatus, { label: string; color: string; hint: string }> = {
  online: {
    label: 'Онлайн',
    color: 'success.main',
    hint: 'Изменения из других вкладок и устройств появляются автоматически',
  },
  connecting: { label: 'Подключение…', color: 'text.disabled', hint: 'Подключаемся к серверу' },
  offline: {
    label: 'Нет связи',
    color: 'warning.main',
    hint: 'Обновления в реальном времени недоступны, доска обновится после переподключения',
  },
};

export function RealtimeIndicator({
  status,
  compact,
}: {
  status: RealtimeStatus;
  compact: boolean;
}) {
  const view = VIEW[status];
  return (
    <Tooltip title={view.hint}>
      <Stack
        direction="row"
        spacing={0.75}
        sx={{ alignItems: 'center' }}
        role="status"
        aria-label={view.label}
      >
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: view.color }} />
        {!compact && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {view.label}
          </Typography>
        )}
      </Stack>
    </Tooltip>
  );
}
