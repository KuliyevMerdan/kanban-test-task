import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { TASK_STATUSES } from '@kanban/shared';

// Placeholder for stage 0: proves that Next, MUI and the shared package are wired up.
// The real board replaces this page in stage 3.
export default function HomePage() {
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Канбан
      </Typography>
      <Stack direction="row" spacing={1}>
        {TASK_STATUSES.map((status) => (
          <Chip key={status} label={status} />
        ))}
      </Stack>
    </Container>
  );
}
