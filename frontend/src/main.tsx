import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import { useAuthStore } from './store/useAuthStore'
import toast from 'react-hot-toast'

// 글로벌 Fetch 인터셉터 - 401/403 응답 시 자동 로그아웃 처리
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const url = args[0].toString();
  const response = await originalFetch(...args);
  
  if ((response.status === 401 || response.status === 403) && !url.includes('/api/auth/login') && !url.includes('/api/auth/signup')) {
    const { logout, isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      logout();
      toast.error('세션이 만료되었거나 접근 권한이 없습니다. 다시 로그인해주세요.');
      window.location.href = '/login';
    }
  }
  return response;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
