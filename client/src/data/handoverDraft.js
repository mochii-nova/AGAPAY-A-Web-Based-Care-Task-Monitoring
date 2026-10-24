// =====================================================================
//  TEMPORARY: handover drafts
//
//  The backend has no draft status yet, so "Save Draft" keeps the
//  unfinished handover in this browser only (localStorage), one draft
//  per caregiver, shift and day. Remove when the backend supports drafts.
// =====================================================================

export const draftKeyFor = (userId, shiftId, date) => `agapay.handoverDraft.${userId}.${shiftId}.${date}`;

export function loadDraft(key) {
  try {
    return key ? JSON.parse(localStorage.getItem(key)) : null;
  } catch {
    return null;
  }
}

export function saveDraft(key, draft) {
  try {
    localStorage.setItem(key, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to clear
  }
}
