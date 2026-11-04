// One rule for every search box. Upper/lower case, extra spaces and the words "room" / "rm" are
// ignored, so "Room 102", "room 102", "Rm 102", "rm102" and "102" all find room 102.
// Anything else still matches part of a name, ID or task ("maria", "RP-2020", "2020-001").

// What was typed -> the text to look for ("" = show everything)
export const searchTerm = (text = '') =>
  text
    .toLowerCase()
    .replace(/\b(room|rm)\.?(?=\s|\d|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// True when the term is empty or found in any of the fields (empty fields are skipped)
export const matchesSearch = (term, ...fields) =>
  !term || fields.some((f) => f != null && String(f).toLowerCase().replace(/\s+/g, ' ').includes(term));
