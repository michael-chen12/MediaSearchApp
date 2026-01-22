import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ListsProvider } from './context/ListsContext';
import { WatchProgressProvider } from './context/WatchProgressContext';
import { initAnalytics } from './lib/analytics';
import './index.css';
import App from './App.jsx';

// Initialize analytics (corporate pattern: initialize early)
initAnalytics();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <ListsProvider>
            <WatchProgressProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </WatchProgressProvider>
          </ListsProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
