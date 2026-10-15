'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  createTaskSchema,
  type Task,
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TITLE_MAX_LENGTH,
  type TaskStatus,
} from '@kanban/shared';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { type z } from 'zod';
import { useCreateTask, useMoveTask, useUpdateTask } from '@/entities/task/hooks';
import { PRIORITY_LABELS, STATUS_LABELS } from '@/entities/task/labels';
import { ApiError, errorMessage } from '@/shared/api/http';
import { useNotify } from '@/shared/ui/notifications';

type FormInput = z.input<typeof createTaskSchema>;
type FormOutput = z.output<typeof createTaskSchema>;

export type TaskDialogState = { mode: 'create'; status: TaskStatus } | { mode: 'edit'; task: Task };

interface TaskDialogProps {
  state: TaskDialogState;
  fullScreen: boolean;
  onClose: () => void;
  onDelete: (task: Task) => void;
}

const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });

/** Create a task, or view + edit an existing one. Mount with a `key` per task to reset the form. */
export function TaskDialog({ state, fullScreen, onClose, onDelete }: TaskDialogProps) {
  const task = state.mode === 'edit' ? state.task : null;
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const moveTask = useMoveTask();
  const notify = useNotify();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting, dirtyFields },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(createTaskSchema),
    mode: 'onTouched',
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      priority: task?.priority ?? 'MEDIUM',
      status: task?.status ?? (state.mode === 'create' ? state.status : 'NEW'),
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      if (!task) {
        await createTask.mutateAsync(values);
        notify({ message: 'Задача создана', severity: 'success' });
      } else {
        if (dirtyFields.title || dirtyFields.description || dirtyFields.priority) {
          await updateTask.mutateAsync({
            id: task.id,
            input: {
              title: values.title,
              description: values.description ?? '',
              priority: values.priority,
            },
          });
        }
        if (values.status !== task.status) {
          await moveTask.mutateAsync({
            id: task.id,
            input: { status: values.status, afterId: null },
          });
        }
        notify({ message: 'Изменения сохранены', severity: 'success' });
      }
      onClose();
    } catch (error) {
      // Field errors from the API go next to the fields, anything else above the form.
      const details = error instanceof ApiError ? error.body?.details : undefined;
      details?.forEach(({ path, message }) => {
        if (path === 'title' || path === 'description') setError(path, { message });
      });
      setSubmitError(errorMessage(error));
    }
  });

  return (
    <Dialog
      open
      onClose={isSubmitting ? undefined : onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      aria-labelledby="task-dialog-title"
    >
      <Box component="form" onSubmit={onSubmit} noValidate sx={{ display: 'contents' }}>
        <DialogTitle id="task-dialog-title" sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
          <Box sx={{ flex: 1 }}>{task ? 'Задача' : 'Новая задача'}</Box>
          <IconButton aria-label="Закрыть" onClick={onClose} disabled={isSubmitting}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2.5}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            <TextField
              {...register('title')}
              label="Название"
              required
              autoFocus={!task}
              fullWidth
              error={!!errors.title}
              helperText={errors.title?.message}
              slotProps={{ htmlInput: { maxLength: TASK_TITLE_MAX_LENGTH } }}
            />

            <TextField
              {...register('description')}
              label="Описание"
              multiline
              minRows={3}
              maxRows={12}
              fullWidth
              error={!!errors.description}
              helperText={errors.description?.message}
              slotProps={{ htmlInput: { maxLength: TASK_DESCRIPTION_MAX_LENGTH } }}
            />

            <FormControl>
              <FormLabel id="priority-label" sx={{ mb: 1 }}>
                Приоритет
              </FormLabel>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    size="small"
                    color="primary"
                    aria-labelledby="priority-label"
                    value={field.value}
                    // Clicking the selected button would unselect it: keep a value.
                    onChange={(_, value) => value && field.onChange(value)}
                  >
                    {TASK_PRIORITIES.map((priority) => (
                      <ToggleButton key={priority} value={priority}>
                        {PRIORITY_LABELS[priority]}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                )}
              />
            </FormControl>

            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <TextField {...field} select label="Колонка" fullWidth>
                  {TASK_STATUSES.map((status) => (
                    <MenuItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            {task && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Создана {dateFormat.format(new Date(task.createdAt))}
                {task.updatedAt !== task.createdAt &&
                  ` · изменена ${dateFormat.format(new Date(task.updatedAt))}`}
              </Typography>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          {task && (
            <Button
              color="error"
              startIcon={<DeleteOutlinedIcon />}
              onClick={() => onDelete(task)}
              disabled={isSubmitting}
              sx={{ mr: 'auto' }}
            >
              Удалить
            </Button>
          )}
          <Button onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button
            type="submit"
            variant="contained"
            loading={isSubmitting}
            disabled={!!task && !isDirty}
          >
            {task ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
