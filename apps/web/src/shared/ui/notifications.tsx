'use client';

import Alert, { type AlertColor } from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

export interface Notification {
  message: string;
  severity?: AlertColor;
  /** Optional inline action, e.g. "Отменить". */
  action?: { label: string; onClick: () => void };
  autoHideMs?: number;
}

type Notify = (notification: Notification) => void;

const NotificationsContext = createContext<Notify | null>(null);

/** One snackbar at a time; a new notification replaces the current one. */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<(Notification & { key: number }) | null>(null);
  const [open, setOpen] = useState(false);

  const notify = useCallback<Notify>((notification) => {
    setCurrent({ ...notification, key: Date.now() });
    setOpen(true);
  }, []);

  const close = () => setOpen(false);

  return (
    <NotificationsContext.Provider value={notify}>
      {children}
      <Snackbar
        key={current?.key}
        open={open}
        onClose={(_, reason) => reason !== 'clickaway' && close()}
        autoHideDuration={current?.autoHideMs ?? 5000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={current?.severity ?? 'info'}
          variant="filled"
          onClose={close}
          sx={{ width: '100%', alignItems: 'center' }}
          action={
            current?.action && (
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  current.action?.onClick();
                  close();
                }}
              >
                {current.action.label}
              </Button>
            )
          }
        >
          {current?.message}
        </Alert>
      </Snackbar>
    </NotificationsContext.Provider>
  );
}

export function useNotify(): Notify {
  const notify = useContext(NotificationsContext);
  if (!notify) throw new Error('useNotify must be used inside <NotificationsProvider>');
  return notify;
}
