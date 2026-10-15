'use client';

import { TASK_PRIORITIES, type TaskPriority } from '@kanban/shared';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { PRIORITY_LABELS } from '@/entities/task/labels';
import { type BoardFilter, EMPTY_FILTER, isFilterActive } from '../model';

const SEARCH_DEBOUNCE_MS = 250;

interface FilterBarProps {
  filter: BoardFilter;
  onChange: (filter: BoardFilter) => void;
  shown: number;
  total: number;
}

export function FilterBar({ filter, onChange, shown, total }: FilterBarProps) {
  // The input reacts instantly; the URL (and the board) update after a short pause.
  const [query, setQuery] = useState(filter.query);
  const [sentQuery, setSentQuery] = useState(filter.query);
  const [urlQuery, setUrlQuery] = useState(filter.query);

  // Sync from the URL only on external changes ("Сбросить", back button). The echo of
  // our own debounced update (it arrives with a delay) must not overwrite what the
  // user has typed since.
  if (filter.query !== urlQuery) {
    setUrlQuery(filter.query);
    if (filter.query !== sentQuery) {
      setSentQuery(filter.query);
      setQuery(filter.query);
    }
  }

  useEffect(() => {
    if (query === sentQuery) return;
    const timer = setTimeout(() => {
      setSentQuery(query);
      onChange({ ...filter, query });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, sentQuery, filter, onChange]);

  const active = isFilterActive(filter);

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ alignItems: { sm: 'center' }, mb: 2 }}
      role="search"
    >
      <TextField
        size="small"
        placeholder="Поиск по задачам"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        sx={{ width: { sm: 320 } }}
        slotProps={{
          htmlInput: { 'aria-label': 'Поиск по названию и описанию' },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: query && (
              <InputAdornment position="end">
                <IconButton size="small" aria-label="Очистить поиск" onClick={() => setQuery('')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      <ToggleButtonGroup
        size="small"
        value={filter.priorities}
        onChange={(_, priorities: TaskPriority[]) => onChange({ ...filter, priorities })}
        aria-label="Фильтр по приоритету"
      >
        {TASK_PRIORITIES.map((priority) => (
          <ToggleButton key={priority} value={priority} sx={{ textTransform: 'none', px: 1.5 }}>
            {PRIORITY_LABELS[priority]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {active && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }} aria-live="polite">
            Найдено {shown} из {total}
          </Typography>
          <Button size="small" onClick={() => onChange(EMPTY_FILTER)}>
            Сбросить
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
