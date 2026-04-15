import { NavLink, useLocation } from 'react-router-dom';
import { Home, User } from 'lucide-react';
import styles from './BottomNav.module.css';

export function BottomNav() {
  const location = useLocation();

  // BottomNav를 보여줄 경로 (모달처럼 뜨는 화면이나 깊은 화면은 안 보여줌)
  const showNavPaths = ['/', '/mypage'];
  if (!showNavPaths.includes(location.pathname)) {
    return null;
  }

  return (
    <nav className={styles.nav}>
      <NavLink 
        to="/" 
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
      >
        <Home size={24} />
        <span>홈</span>
      </NavLink>

      <NavLink 
        to="/mypage" 
        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
      >
        <User size={24} />
        <span>마이페이지</span>
      </NavLink>
    </nav>
  );
}
