// ═══════════════════════════════════════════════════════
// StreakHeatmap.tsx — Study activity streak heatmap
// ═══════════════════════════════════════════════════════

import React from 'react';
import { StudySession } from '../types';

export interface StreakHeatmapProps {
  sessions: StudySession[];
}

export function StreakHeatmap({ sessions }: StreakHeatmapProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: string[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toDateString());
  }

  const sessionDays = new Set(sessions.map(s => new Date(s.date).toDateString()));
  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {week.map(day => {
            const active = sessionDays.has(day);
            const isToday = day === today.toDateString();
            return (
              <div
                key={day}
                title={day}
                className="heat-cell"
                style={{
                  background: active ? 'var(--green)' : 'var(--card2)',
                  border: isToday ? '1px solid var(--primary)' : '1px solid transparent',
                  opacity: active ? 1 : 0.5
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
