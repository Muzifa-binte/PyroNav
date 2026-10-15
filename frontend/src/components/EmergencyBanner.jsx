import React, { useEffect, useState } from 'react';

export default function EmergencyBanner({ active, message, exitId }) {
  const [muted, setMuted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      // Small delay for slide-down animation
      setTimeout(() => setVisible(true), 10);
    } else {
      setVisible(false);
    }
  }, [active]);

  if (!active) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: '#D62828',
        color: '#fff',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        fontSize: 18,
        fontWeight: 700,
        fontFamily: 'Inter, sans-serif',
        boxShadow: '0 4px 20px rgba(214,40,40,0.4)',
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <span
        style={{
          fontSize: 24,
          animation: 'emergencyPulse 1s ease-in-out infinite',
          display: 'inline-block',
        }}
        aria-hidden="true"
      >
        🔥
      </span>
      <span style={{ flex: 1 }}>
        FIRE RISK CRITICAL: {message}. Evacuate via {exitId}.
      </span>
      <button
        onClick={() => setMuted(m => !m)}
        aria-label={muted ? 'Unmute alarm' : 'Mute alarm'}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: 8,
          color: '#fff',
          padding: '4px 12px',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {muted ? '🔇 Unmute' : '🔔 Mute'}
      </button>
    </div>
  );
}
