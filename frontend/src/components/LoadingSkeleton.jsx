import React from 'react'

const pulse = {
  background: 'linear-gradient(90deg, var(--surface-base) 25%, var(--surface-raised) 50%, var(--surface-base) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  borderRadius: 'var(--radius-sm)',
}

export default function LoadingSkeleton({ lines = 3, height = 16, gap = 10 }) {
  return (
    <div aria-busy="true" aria-label="Loading…">
      <style>{`
        @keyframes skeleton-pulse {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            ...pulse,
            height,
            marginBottom: i < lines - 1 ? gap : 0,
            width: i === lines - 1 ? '60%' : '100%',
          }}
        />
      ))}
    </div>
  )
}
