import React from 'react'

const shimmerStyle = {
  background: 'linear-gradient(90deg, rgba(200,210,235,0.50) 25%, rgba(255,255,255,0.80) 50%, rgba(200,210,235,0.50) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
  borderRadius: 6,
}

export default function LoadingSkeleton({ rows = 3, lines, cols = 1, height, type = 'card', gap = 12 }) {
  // Support legacy `lines` prop as alias for `rows`
  const rowCount = lines ?? rows

  if (type === 'map') {
    return (
      <div
        aria-busy="true"
        aria-label="Loading…"
        style={{
          ...shimmerStyle,
          width: '100%',
          height: height || 400,
        }}
      />
    )
  }

  if (type === 'table') {
    return (
      <div aria-busy="true" aria-label="Loading…" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: rowCount }).map((_, i) => (
          <div key={i} style={{ ...shimmerStyle, height: 40, borderRadius: 6 }} />
        ))}
      </div>
    )
  }

  // Default: card type
  if (cols > 1) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading…"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 16,
        }}
      >
        {Array.from({ length: cols * rowCount }).map((_, i) => (
          <div key={i} style={{ ...shimmerStyle, height: height || 120 }} />
        ))}
      </div>
    )
  }

  return (
    <div aria-busy="true" aria-label="Loading…">
      {Array.from({ length: rowCount }).map((_, i) => (
        <div
          key={i}
          style={{
            ...shimmerStyle,
            height: height || 16,
            marginBottom: i < rowCount - 1 ? gap : 0,
            width: i === rowCount - 1 ? '60%' : '100%',
          }}
        />
      ))}
    </div>
  )
}
