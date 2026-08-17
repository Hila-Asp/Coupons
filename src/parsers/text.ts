const INVISIBLE_MARKS =
  /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u00AD]/g;

export function stripInvisibleChars(text: string): string {
  return text.replace(INVISIBLE_MARKS, '');
}

export function trimTrailingPunctuation(value: string): string {
  return value.replace(/[.,;:!?）)\]\u05BE]+$/u, '');
}

export function findPluxeeVoucherUrl(text: string): string | undefined {
  const cleaned = stripInvisibleChars(text);
  const match = cleaned.match(
    /https:\/\/myconsumers\.pluxee\.co\.il\/[^\s<>"'）)\]]+/i,
  );
  if (!match) {
    return undefined;
  }
  return trimTrailingPunctuation(match[0]);
}
