/**
 * Philippine mobile number handling.
 *
 * State always holds the bare ten-digit subscriber number. The +63 country
 * code is fixed chrome in the UI and only joined on at submit, so there is one
 * canonical value to validate rather than a string that may or may not carry a
 * prefix.
 */

/** Ten digits, always starting with 9 — the PH mobile range. */
export const PH_SUBSCRIBER = /^9\d{9}$/;

/**
 * Filipino handsets display a mobile as 0917…, and a saved contact pastes as
 * +63917… or 63917…. All three are accepted and reduced to the same digits
 * rather than rejected.
 */
export function toSubscriberDigits(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("63")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** Display grouping: "9171234567" -> "917 123 4567". */
export function formatSubscriber(digits: string): string {
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)]
    .filter(Boolean)
    .join(" ");
}

/** The E.164 form the API stores, e.g. "+639171234567". */
export const toE164 = (digits: string) => `+63${digits}`;

/**
 * Where the caret belongs after reformatting.
 *
 * Formatting rewrites the whole value, which would otherwise throw the caret
 * to the end on every keystroke — maddening when correcting a digit in the
 * middle. Counting digits rather than characters keeps the caret against the
 * same digit regardless of how the spaces move around it.
 */
export function caretAfterFormat(formatted: string, digitsBeforeCaret: number): number {
  if (digitsBeforeCaret <= 0) return 0;

  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      seen++;
      if (seen === digitsBeforeCaret) return i + 1;
    }
  }
  return formatted.length;
}

/** How many digits precede `index` in `value`. */
export const countDigits = (value: string, index: number) =>
  (value.slice(0, index).match(/\d/g) ?? []).length;
