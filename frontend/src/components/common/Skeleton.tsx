import { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: CSSProperties;
}

export function Skeleton({ width = '100%', height = '20px', borderRadius, style }: SkeletonProps) {
  return (
    <div
      className="skeleton-loading"
      style={{
        width,
        height,
        borderRadius: borderRadius || 'var(--border-radius-sm)',
        ...style,
      }}
    />
  );
}
