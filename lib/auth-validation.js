export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 30;
export const NAME_MAX = 40;
export const COMPANY_NAME_MAX = 50;

export const USERNAME_ALLOWED_TEXT = `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters. Letters, numbers, . _ - @ only.`;
export const PASSWORD_ALLOWED_TEXT = `Password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters with at least one letter and one number.`;
export const PERSON_NAME_ALLOWED_TEXT = `Name can use letters and spaces only (max ${NAME_MAX} characters).`;
export const COMPANY_NAME_ALLOWED_TEXT = `Company name can use letters, numbers, and spaces only (max ${COMPANY_NAME_MAX} characters).`;
export const EMAIL_ALLOWED_TEXT = "Email must be a valid address (e.g. user@example.com).";
export const PHONE_ALLOWED_TEXT = "Phone number uses 10 digits and displays as (234)-222-3333.";

const personNamePattern = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const companyNamePattern = /^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/;
const usernamePattern = /^[A-Za-z0-9._@-]+$/;
const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function isValidPersonName(value) {
  const trimmed = value.trim();
  return trimmed.length <= NAME_MAX && personNamePattern.test(trimmed);
}

export function isValidCompanyName(value) {
  const trimmed = value.trim();
  return trimmed.length <= COMPANY_NAME_MAX && companyNamePattern.test(trimmed);
}

export function isValidUsername(value) {
  const trimmed = value.trim();
  return trimmed.length >= USERNAME_MIN && trimmed.length <= USERNAME_MAX && usernamePattern.test(trimmed);
}

export function isValidPassword(value) {
  return value.length >= PASSWORD_MIN && value.length <= PASSWORD_MAX && /[A-Za-z]/.test(value) && /[0-9]/.test(value);
}

export function isValidEmail(value) {
  const trimmed = value.trim();
  return trimmed.length <= 254 && emailPattern.test(trimmed);
}

export function normalizePhoneDigits(value) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function formatPhoneInput(value) {
  const digits = normalizePhoneDigits(value);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)})-${digits.slice(3)}`;
  return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export function isValidPhone(value) {
  return normalizePhoneDigits(value).length === 10;
}
