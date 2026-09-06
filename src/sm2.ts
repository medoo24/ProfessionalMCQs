// ═══════════════════════════════════════════════════════
// sm2.ts — SuperMemo SM-2 spaced repetition algorithm
//
// This implements the classic SM-2 algorithm adapted for
// 4 quality levels (Again / Hard / Good / Easy) instead of 0–5.
// ═══════════════════════════════════════════════════════

import { SM2Card } from './types';

/**
 * Rate a card and compute the next review schedule.
 *
 * @param card     - Existing card state (or null/undefined for new cards)
 * @param quality  - Rating: 0=Again, 1=Hard, 2=Good, 3=Easy
 * @returns        - Updated card state
 */
export function sm2(card: SM2Card | null | undefined, quality: number): SM2Card {
  let { interval = 1, easeFactor = 2.5, repetitions = 0 } = card || {};

  // Map our 4-level quality (0–3) to SM-2 quality scale (0–5)
  const smQ = [0, 2, 4, 5][quality] ?? 0;

  if (smQ < 3) {
    // Failed recall — reset to start
    repetitions = 0;
    interval = 1;
  } else {
    // Successful recall — advance schedule
    if (repetitions === 0)      interval = 1;
    else if (repetitions === 1) interval = 6;
    else                        interval = Math.round(interval * easeFactor);
    repetitions++;
  }

  // Update ease factor (clamped to minimum 1.3)
  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - smQ) * (0.08 + (5 - smQ) * 0.02)
  );

  const nextDue = Date.now() + interval * 86400000; // interval in days → ms

  return { interval, easeFactor, repetitions, nextDue, lastReviewed: Date.now() };
}

/**
 * Check if a card is due for review right now.
 *
 * @param card - Card state object
 * @returns boolean
 */
export function isDue(card: SM2Card | null | undefined): boolean {
  if (!card || !card.nextDue) return false;
  return Date.now() >= card.nextDue;
}
