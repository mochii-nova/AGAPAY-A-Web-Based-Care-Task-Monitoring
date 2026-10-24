// =====================================================================
//  TEMPORARY: profile details the backend can't store yet
//
//  The users table only has name, username (= Employee ID) and role,
//  and there is no route to update them. Until Aeron adds those, the
//  photo, name changes, phone, email and emergency contact are kept in
//  this browser only (localStorage), one entry per user.
// =====================================================================

const keyFor = (userId) => `agapay.profile.${userId ?? 'guest'}`;

export function readProfile(userId) {
  try {
    return JSON.parse(localStorage.getItem(keyFor(userId))) ?? {};
  } catch {
    return {};
  }
}

export function writeProfile(userId, data) {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(data));
    return true;
  } catch {
    // Storage full or blocked (a photo can be large)
    return false;
  }
}
