// One way to compare what people type: case, Latin accents, apostrophes and
// punctuation folded away, so "Zizek's  Notes" and "žižeks notes" match.
// Marks that are part of a letter in other scripts (Devanagari and Bengali
// vowel signs, for instance) are kept: "मेला" and "माला" are different words.
// Pure and dependency-free; used by the record search, the title
// suggestions, and the identity of pieces logged without a link.
export function fold(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['‘’ʼ]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();
}
