import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeStore } from '../../store/useThemeStore';
import { BottomNav } from './BottomNav';
import styles from './Layout.module.css';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useThemeStore();

  const isHome = location.pathname === '/' || location.pathname === '/login';

  const toggleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const getThemeIcon = () => {
    if (theme === 'system') return '⚙️';
    if (theme === 'light') return '☀️';
    return '🌙';
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
      <div>
        <button 
          onClick={toggleTheme}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '8px', borderRadius: '50%' }}
          title={`현재 테마: ${theme}`}
        >
          {getThemeIcon()}
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
