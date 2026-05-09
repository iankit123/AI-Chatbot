/**
 * Free-send quota before the recharge modal blocks the next user message (per companion; tracked as `messageCount_*` in ChatContext).
 *
 * Example when value is **3**: user sends successfully **three** times (`messageCount` ends up 0→1→2→3); the **fourth** send hits `messageCount >= 3` and opens recharge.
 *
 * To change the gate later (e.g. five free messages = wall on sixth send): set this to **5** so `messageCount >= 5` — edit **only this constant**, plus any UI copy that mentions numbers elsewhere if present.
 */
export const FREE_USER_MESSAGE_ALLOWANCE = 3;
