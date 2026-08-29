// ═══════════════════════════════════════════════════════
// sm2.js — SuperMemo SM-2 spaced repetition algorithm
//
// This implements the classic SM-2 algorithm adapted for
// 4 quality levels (Again / Hard / Good / Easy) instead of 0–5.
// ═══════════════════════════════════════════════════════

/**
 * SM-2 card state object:
 * {
 *   interval:      number  // days until next review
 *   easeFactor:    number  // multiplier for interval growth (min 1.3)
 *   repetitions:   number  // successful review count
 *   nextDue:       number  // timestamp (ms) of next due date
 *   lastReviewed:  number  // timestamp (ms) of last review
 * }
 */

/**
 * Rate a card and compute the next review schedule.
 *
 * @param {object} card     - Existing card state (or null/undefined for new cards)
 * @param {number} quality  - Rating: 0=Again, 1=Hard, 2=Good, 3=Easy
 * @returns {object}        - Updated card state
 */
function sm2(card, quality) {
  let { interval = 1, easeFactor = 2.5, repetitions = 0 } = card || {};

  // Map our 4-level quality (0–3) to SM-2 quality scale (0–5)
  const smQ = [0, 2, 4, 5][quality];

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
 * @param {object} card - Card state object
 * @returns {boolean}
 */
function isDue(card) {
  if (!card || !card.nextDue) return false;
  return Date.now() >= card.nextDue;
}
