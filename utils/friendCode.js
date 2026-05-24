// Encodes a user profile into a shareable friend code.
export const encodeFriendCode = (user) => {
  try {
    return btoa(encodeURIComponent(JSON.stringify({ id: user.id, name: user.name })));
  } catch {
    return null;
  }
};

// Decodes a friend code back into { id, name }. Returns null if invalid.
export const decodeFriendCode = (code) => {
  try {
    const parsed = JSON.parse(decodeURIComponent(atob(code.trim())));
    if (!parsed?.id || !parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
};

// Short display code shown in the UI (e.g. "TS-A3F2B8").
export const shortCode = (userId) => {
  const raw = userId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return 'TS-' + raw.slice(-6);
};
