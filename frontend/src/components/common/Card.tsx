import React from 'react';
import styles from './Card.module.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  hoverable?: boolean;
}

export function Card({
  title,
  subtitle,
  hoverable = false,
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div className={`${styles.card} ${hoverable ? styles.hoverable : ''} ${className}`} {...props}>
      {title && <h3 className={styles.title}>{title}</h3>}
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
