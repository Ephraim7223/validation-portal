import { canonicalPersonnelRole } from 'src/common/helpers';
import { digitsOnly, isValidPhoneInput } from './phone.util';

const GENDERS = new Set(['Male', 'Female']);

export type ApplicantCheckResult =
  | {
      ok: true;
      nin: number;
      phoneDigits: string;
      age: number;
      role: string;
    }
  | { ok: false; message: string };

export function validateApplicantFields(input: {
  email?: string;
  phoneNumber?: string;
  NIN?: string;
  D_O_B?: string;
  gender?: string;
  role?: string;
  start_date?: string | Date;
  end_date?: string | Date;
  requireMembershipDates?: boolean;
}): ApplicantCheckResult {
  const email = input.email?.trim() || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Enter a valid email address' };
  }

  if (!isValidPhoneInput(input.phoneNumber) || digitsOnly(input.phoneNumber).length < 10) {
    return { ok: false, message: 'Enter a valid phone number' };
  }

  const ninDigits = digitsOnly(input.NIN);
  if (!/^\d{11}$/.test(ninDigits)) {
    return { ok: false, message: 'NIN must be 11 digits' };
  }

  if (!GENDERS.has((input.gender || '').trim())) {
    return { ok: false, message: 'Gender must be Male or Female' };
  }

  const role = canonicalPersonnelRole(input.role);
  if (!role) {
    return { ok: false, message: 'Role must be Staff, Intern, or Freelancer' };
  }

  const parsedDOB = new Date(input.D_O_B || '');
  if (isNaN(parsedDOB.getTime())) {
    return { ok: false, message: 'Invalid date of birth format' };
  }

  const today = new Date();
  let age = today.getFullYear() - parsedDOB.getFullYear();
  const month = today.getMonth() - parsedDOB.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < parsedDOB.getDate())) {
    age--;
  }
  if (parsedDOB > today || age < 15 || age > 100) {
    return { ok: false, message: 'Enter a valid date of birth' };
  }

  if (input.requireMembershipDates || input.start_date || input.end_date) {
    const range = membershipDateError(input.start_date, input.end_date);
    if (range) return { ok: false, message: range };
  }

  return {
    ok: true,
    nin: Number(ninDigits),
    phoneDigits: digitsOnly(input.phoneNumber),
    age,
    role,
  };
}

export function membershipDateError(
  start?: string | Date,
  end?: string | Date,
): string | null {
  const startDate = new Date(start || '');
  const endDate = new Date(end || '');
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 'Invalid start date or end date';
  }
  if (endDate <= startDate) {
    return 'End date must be after the start date';
  }
  return null;
}
