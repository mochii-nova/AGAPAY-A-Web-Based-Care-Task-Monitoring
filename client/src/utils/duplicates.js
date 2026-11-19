// Spotting likely duplicates before saving (Add resident, Add staff, Create task).
// The same name ignores capital letters and extra spaces: " hannah  PEREZ" = "Hannah Perez".
export const sameText = (a, b) => normalize(a) === normalize(b);
const normalize = (text) => String(text ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
