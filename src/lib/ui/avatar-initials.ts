/**
 * Avatar initials: use structured **first + last name** (CRM, profile custom fields),
 * not marketing **display name** / handles. See docs/reference/member-profile-vs-crm-contact.md.
 */

function firstLetterFromWord(word: string): string {
  for (const ch of word) {
    if ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z")) return ch.toUpperCase();
  }
  return "";
}

function lettersFromString(s: string, max: number): string {
  const out: string[] = [];
  for (const ch of s) {
    if ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z")) {
      out.push(ch.toUpperCase());
      if (out.length >= max) break;
    }
  }
  return out.join("");
}

/**
 * Two-letter initials from given + family name. Falls back to one name, then email local-part
 * (still not display nickname). Returns "?" if nothing usable.
 */
export function initialsFromFirstLast(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  emailFallback?: string | null | undefined
): string {
  const first = (firstName ?? "").trim();
  const last = (lastName ?? "").trim();
  if (first && last) {
    const a = firstLetterFromWord(first);
    const b = firstLetterFromWord(last);
    const pair = (a + b).trim();
    if (pair) return pair;
  }
  if (first) {
    const two = lettersFromString(first, 2);
    if (two.length >= 2) return two.slice(0, 2);
    if (two.length === 1) return two;
  }
  if (last) {
    const two = lettersFromString(last, 2);
    if (two.length >= 2) return two.slice(0, 2);
    if (two.length === 1) return two;
  }
  const em = (emailFallback ?? "").trim();
  if (em.includes("@")) {
    const local = (em.split("@")[0] ?? "").trim();
    const two = lettersFromString(local, 2);
    if (two.length >= 2) return two.slice(0, 2);
    if (two.length === 1) return two;
  }
  return "?";
}
