import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeStore } from '../../store/useThemeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { BottomNav } from './BottomNav';
import styles from './Layout.module.css';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useThemeStore();
  const { isAuthenticated } = useAuthStore();

  const isHome = location.pathname === '/' || location.pathname === '/login';

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className={styles.header}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {!isHome && (
          <button 
            onClick={() => navigate(-1)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-primary)', padding: '0', display: 'flex', alignItems: 'center' }}
            aria-label="뒤로 가기"
          >
            ←
          </button>
        )}
        <h1 className={styles.headerTitle} onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>BidChal</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* PC에서만 보이는 마이페이지 링크 */}
        {isAuthenticated && (
          <button
            onClick={() => navigate('/mypage')}
            className={styles.desktopOnly}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '8px', borderRadius: '50%' }}
            title="마이페이지"
          >
            👤
          </button>
        )}
        <button 
          onClick={toggleTheme}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '8px', borderRadius: '50%' }}
          title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.main}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

