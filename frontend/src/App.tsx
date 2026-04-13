import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Lobby } from './pages/Lobby';
import { useAuthStore } from './store/useAuthStore';

import { ReactNode } from 'react';

// 인증 가드 (PrivateRoute)
function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route 
          path="/" 
          element={
            <RequireAuth>
              <Lobby />
            </RequireAuth>
          } 
        />
      </Routes>
    </Layout>
  );
}

export default App;
