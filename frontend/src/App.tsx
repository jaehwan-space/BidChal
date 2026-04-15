import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Lobby } from './pages/Lobby';
import { Room } from './pages/Room';
import { RoomSettings } from './pages/RoomSettings';
import { HostControl } from './pages/HostControl';
import { DisplayView } from './pages/DisplayView';
import { Mypage } from './pages/Mypage';
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
    <Routes>
      {/* 디스플레이 뷰 - Layout 없이 풀스크린 (로그인 필요) */}
      <Route 
        path="/room/:id/display" 
        element={
          <RequireAuth>
            <DisplayView />
          </RequireAuth>
        } 
      />
      
      {/* 나머지는 Layout 안에 */}
      <Route path="*" element={
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
            <Route 
              path="/room/:id/settings" 
              element={
                <RequireAuth>
                  <RoomSettings />
                </RequireAuth>
              } 
            />
            <Route 
              path="/room/:id/host" 
              element={
                <RequireAuth>
                  <HostControl />
                </RequireAuth>
              } 
            />
            <Route 
              path="/room/:id" 
              element={
                <RequireAuth>
                  <Room />
                </RequireAuth>
              } 
            />
            <Route 
              path="/mypage" 
              element={
                <RequireAuth>
                  <Mypage />
                </RequireAuth>
              } 
            />
          </Routes>
        </Layout>
      } />
    </Routes>
  );
}

export default App;
