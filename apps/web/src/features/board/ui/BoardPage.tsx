'use client';

import { type Task, type TaskStatus } from '@kanban/shared';
import AddIcon from '@mui/icons-material/Add';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Fab from '@mui/material/Fab';
import { useTheme } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useMemo, useState } from 'react';
import { useDeleteTask, useRestoreTask, useTasks } from '@/entities/task/hooks';
import { useTasksRealtime } from '@/entities/task/realtime';
import { RealtimeIndicator } from '@/entities/task/ui/RealtimeIndicator';
import { EMPTY_FILTER, filterTasks, isFilterActive } from '@/features/board-filter/model';
import { FilterBar } from '@/features/board-filter/ui/FilterBar';
import { useBoardFilter } from '@/features/board-filter/useBoardFilter';
import { TaskDialog, type TaskDialogState } from '@/features/task-editor/ui/TaskDialog';
import { errorMessage } from '@/shared/api/http';
import { useNotify } from '@/shared/ui/notifications';
import { Board } from './Board';
import { BoardError, BoardSkeleton, EmptyBoard } from './BoardStates';

type DialogState = { mode: 'create'; status: TaskStatus } | { mode: 'edit'; taskId: string };

const UNDO_TIMEOUT_MS = 6000;

/** Page-level composition: data, filter, board, dialogs. */
export function BoardPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const notify = useNotify();

  const { data: tasks, error, isFetching, refetch } = useTasks();
  const deleteTask = useDeleteTask();
  const restoreTask = useRestoreTask();
  const { filter, setFilter } = useBoardFilter();
  const realtimeStatus = useTasksRealtime();

  const [mobileStatus, setMobileStatus] = useState<TaskStatus>('NEW');
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const visibleTasks = useMemo(() => tasks && filterTasks(tasks, filter), [tasks, filter]);

  // The edited task is read from the cache, so the dialog sees updates and closes
  // by itself if the task disappears.
  const dialogState: TaskDialogState | null =
    dialog?.mode === 'create'
      ? dialog
      : dialog?.mode === 'edit'
        ? (() => {
            const task = tasks?.find((item) => item.id === dialog.taskId);
            return task ? { mode: 'edit', task } : null;
          })()
        : null;

  const openCreate = (status: TaskStatus = isMobile ? mobileStatus : 'NEW') =>
    setDialog({ mode: 'create', status });
  const openTask = (task: Task) => setDialog({ mode: 'edit', taskId: task.id });

  // No "are you sure?" dialog: the task disappears at once and can be brought back.
  const deleteWithUndo = (task: Task) => {
    setDialog(null);
    const showError = (cause: unknown) =>
      notify({ message: errorMessage(cause), severity: 'error' });
    deleteTask.mutate(task.id, {
      onSuccess: () =>
        notify({
          message: 'Задача удалена',
          autoHideMs: UNDO_TIMEOUT_MS,
          action: {
            label: 'Отменить',
            onClick: () => restoreTask.mutate(task.id, { onError: showError }),
          },
        }),
      onError: showError,
    });
  };

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar>
          <Typography component="h1" variant="h6" sx={{ fontWeight: 600 }}>
            Канбан
          </Typography>
          <Box sx={{ flex: 1, ml: 2 }}>
            <RealtimeIndicator status={realtimeStatus} compact={isMobile} />
          </Box>
          {!isMobile && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreate()}>
              Новая задача
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container
        maxWidth="xl"
        component="main"
        sx={{ py: { xs: 2, md: 3 }, pb: { xs: 12, md: 3 } }}
      >
        {tasks && visibleTasks ? (
          <>
            {error && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Не удалось обновить доску: {errorMessage(error)}. Показаны последние загруженные
                данные.
              </Alert>
            )}
            {tasks.length === 0 ? (
              <EmptyBoard onCreate={() => openCreate('NEW')} />
            ) : (
              <>
                <FilterBar
                  filter={filter}
                  onChange={setFilter}
                  shown={visibleTasks.length}
                  total={tasks.length}
                />
                {visibleTasks.length === 0 && isFilterActive(filter) ? (
                  <Alert
                    severity="info"
                    action={
                      <Button color="inherit" size="small" onClick={() => setFilter(EMPTY_FILTER)}>
                        Сбросить
                      </Button>
                    }
                  >
                    По этому фильтру задач не найдено
                  </Alert>
                ) : (
                  <Board
                    tasks={visibleTasks}
                    isMobile={isMobile}
                    mobileStatus={mobileStatus}
                    onMobileStatusChange={setMobileStatus}
                    onCreate={openCreate}
                    onOpen={openTask}
                    onDelete={deleteWithUndo}
                  />
                )}
              </>
            )}
          </>
        ) : error ? (
          <BoardError
            message={errorMessage(error)}
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        ) : (
          <BoardSkeleton isMobile={isMobile} />
        )}
      </Container>

      {isMobile && tasks && tasks.length > 0 && (
        <Fab
          color="primary"
          aria-label="Новая задача"
          onClick={() => openCreate()}
          sx={{ position: 'fixed', right: 16, bottom: 'calc(16px + env(safe-area-inset-bottom))' }}
        >
          <AddIcon />
        </Fab>
      )}

      {dialogState && (
        <TaskDialog
          key={dialogState.mode === 'edit' ? dialogState.task.id : `new-${dialogState.status}`}
          state={dialogState}
          fullScreen={isMobile}
          onClose={() => setDialog(null)}
          onDelete={deleteWithUndo}
        />
      )}
    </Box>
  );
}
