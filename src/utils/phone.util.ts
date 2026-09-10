/**
 * Normalize and expand phone values for accurate DB lookups.
 * Legacy code stored phones as numbers (leading zeros stripped) and as strings.
 */
export function digitsOnly(phone: string | number | undefined | null): string {
  if (phone == null) return '';
  return String(phone).replace(/\D/g, '');
}

export function isValidPhoneInput(phone: string | number | undefined | null): boolean {
  const digits = digitsOnly(phone);
  return digits.length >= 7 && digits.length <= 15;
}

/** All plausible stored forms for a given phone input. */
export function phoneMatchVariants(
  phone: string | number | undefined | null,
): Array<string | number> {
  const digits = digitsOnly(phone);
  if (!digits) return [];

  const asNumber = Number(digits);
  const variants: Array<string | number> = [digits, String(asNumber)];

  if (!Number.isNaN(asNumber)) {
    variants.push(asNumber);
  }

  // Nigerian-style: 080... vs 80...
  if (digits.startsWith('0') && digits.length >= 10) {
    const withoutLeadingZero = digits.replace(/^0+/, '');
    variants.push(withoutLeadingZero, String(Number(withoutLeadingZero)));
    if (!Number.isNaN(Number(withoutLeadingZero))) {
      variants.push(Number(withoutLeadingZero));
    }
  } else if (digits.length === 10) {
    variants.push(`0${digits}`);
  }

  return [...new Set(variants)];
}

export function emailsMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function phoneMatchesStored(
  input: string | number | undefined | null,
  stored: string | number | undefined | null,
): boolean {
  if (input == null || stored == null) return false;
  const inputDigits = digitsOnly(input).replace(/^0+/, '');
  const storedDigits = digitsOnly(stored).replace(/^0+/, '');
  return inputDigits.length > 0 && inputDigits === storedDigits;
}
