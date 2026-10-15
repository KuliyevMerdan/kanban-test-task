'use client';

import AddIcon from '@mui/icons-material/Add';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';

const SLOW_LOADING_MS = 4000;

export function BoardSkeleton({ isMobile }: { isMobile: boolean }) {
  // Free hosting puts the API to sleep; the first request can take up to a minute.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box role="status" aria-live="polite" aria-busy="true">
      {slow && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Сервер просыпается после простоя, это может занять до минуты…
        </Alert>
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
          gap: 2,
        }}
      >
        {Array.from({ length: isMobile ? 1 : 3 }, (_, column) => (
          <Stack key={column} spacing={1} sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 1.5 }}>
            <Skeleton width="40%" height={32} />
            {Array.from({ length: 3 - column }, (_, card) => (
              <Skeleton key={card} variant="rounded" height={88} />
            ))}
          </Stack>
        ))}
      </Box>
      <Typography sx={visuallyHidden}>Загрузка задач…</Typography>
    </Box>
  );
}

export function BoardError({
  message,
  onRetry,
  retrying,
}: {
  message: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" size="small" onClick={onRetry} disabled={retrying}>
          {retrying ? 'Загрузка…' : 'Повторить'}
        </Button>
      }
    >
      <AlertTitle>Не удалось загрузить задачи</AlertTitle>
      {message}
    </Alert>
  );
}

export function EmptyBoard({ onCreate }: { onCreate: () => void }) {
  return (
    <Stack
      spacing={2}
      sx={{ alignItems: 'center', textAlign: 'center', py: { xs: 6, md: 10 }, px: 2 }}
    >
      <ViewKanbanOutlinedIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
      <Typography component="h2" variant="h6">
        На доске пока нет задач
      </Typography>
      <Typography sx={{ color: 'text.secondary', maxWidth: 360 }}>
        Создайте первую задачу — она появится в колонке «Новая». Потом её можно перетаскивать между
        колонками.
      </Typography>
      <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
        Создать задачу
      </Button>
    </Stack>
  );
}

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
} as const;
