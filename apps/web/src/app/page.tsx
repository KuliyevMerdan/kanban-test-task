import { Suspense } from 'react';
import { BoardPage } from '@/features/board/ui/BoardPage';

export default function HomePage() {
  // BoardPage reads the filter from the URL (useSearchParams), which needs a Suspense
  // boundary for the statically prerendered page.
  return (
    <Suspense>
      <BoardPage />
    </Suspense>
  );
}
