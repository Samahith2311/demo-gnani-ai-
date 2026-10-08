import React from 'react';

interface WaveformVisualizerProps {
  isActive: boolean;
  level: number; // 0 to 100
  barCount?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isActive,
  level,
  barCount = 12,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        height: '36px',
        padding: '0 8px',
      }}
      aria-label="Audio speech level indicator"
    >
      {Array.from({ length: barCount }).map((_, i) => {
        // Vary height based on audio level and bar index
        const factor = Math.sin((i / (barCount - 1)) * Math.PI);
        const dynamicHeight = isActive
          ? Math.max(4, Math.min(32, Math.round(level * factor * 0.32) + 4))
          : 4;

        return (
          <div
            key={i}
            style={{
              width: '3px',
              height: `${dynamicHeight}px`,
              background: isActive
                ? 'var(--brand-primary)'
                : 'var(--text-muted)',
              borderRadius: '2px',
              transition: 'height 0.08s ease, background 0.2s ease',
              opacity: isActive ? 0.9 : 0.3,
            }}
          />
        );
      })}
    </div>
  );
};
