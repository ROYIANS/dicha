import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import './index.css';
import './i18n';
import { DichaLobeProvider } from './components/DichaLobeProvider';
import { queryClient, router } from './router';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('#root element not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <DichaLobeProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-center" />
      </DichaLobeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
