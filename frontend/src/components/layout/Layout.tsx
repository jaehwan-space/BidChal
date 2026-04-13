import React from 'react';
import styles from './Layout.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <h1 className={styles.headerTitle}>BidChal</h1>
      <div>
        {/* 임시 유저 정보 / 호스트 버튼 등 */}
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
    </div>
  );
}
