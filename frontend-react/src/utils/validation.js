// Field rules for the appraisal form (frontend). The backend repeats the same rules.
// Each validate...() returns an error message, or "" when the value is valid.

/** Trims both ends and turns runs of spaces into a single space. */
export const normalizeSpaces = (value) => (value || "").trim().replace(/\s+/g, " ");

/* ---------------------------------------------------------------- Name */
export const NAME_MIN = 3;
export const NAME_MAX = 60;

export const NAME_MESSAGES = {
  required: "Employee name is mandatory",
  onlySpaces: "Name is required",
  numbers: "Numbers are not allowed",
  special: "Special characters not allowed",
  min: `Name must be at least ${NAME_MIN} characters`,
  max: `Name should not exceed ${NAME_MAX} characters`,
};

export function validateName(value) {
  const raw = value || "";
  if (raw.length === 0) return NAME_MESSAGES.required;
  if (raw.trim().length === 0) return NAME_MESSAGES.onlySpaces; // only spaces typed

  const name = normalizeSpaces(raw); // extra spaces are fixed automatically
  if (/\d/.test(name)) return NAME_MESSAGES.numbers;
  if (!/^\p{L}+(?: \p{L}+)*$/u.test(name)) return NAME_MESSAGES.special;
  if (name.length < NAME_MIN) return NAME_MESSAGES.min;
  if (name.length > NAME_MAX) return NAME_MESSAGES.max;
  return "";
}

/* ---------------------------------------------------------- Employee ID */
export const ID_MIN = 2;
export const ID_MAX = 20;

export const ID_MESSAGES = {
  required: "Employee ID is mandatory",
  invalid: "Only letters, numbers and hyphens are allowed",
  min: `Employee ID must be at least ${ID_MIN} characters`,
  max: `Employee ID should not exceed ${ID_MAX} characters`,
};

export function validateEmployeeId(value) {
  const id = (value || "").trim();
  if (!id) return ID_MESSAGES.required;
  if (!/^[A-Za-z0-9-]+$/.test(id)) return ID_MESSAGES.invalid;
  if (id.length < ID_MIN) return ID_MESSAGES.min;
  if (id.length > ID_MAX) return ID_MESSAGES.max;
  return "";
}

/* ---------------------------------------------------------------- Email */
export const EMAIL_MAX = 100;

export const EMAIL_MESSAGES = {
  required: "Email is required",
  spaces: "Spaces are not allowed",
  invalid: "Invalid email format",
  max: `Email length should not exceed ${EMAIL_MAX} characters`,
};

export const normalizeEmail = (value) => (value || "").trim().toLowerCase();

export function validateEmail(value) {
  const raw = value || "";
  if (raw.trim().length === 0) return EMAIL_MESSAGES.required;

  const email = raw.trim();
  if (/\s/.test(email)) return EMAIL_MESSAGES.spaces;
  if (email.length > EMAIL_MAX) return EMAIL_MESSAGES.max;
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(email)) {
    return EMAIL_MESSAGES.invalid;
  }
  return "";
}

/* ----------------------------------------------------------- Department */
export const DEPARTMENT_MIN = 2;
export const DEPARTMENT_MAX = 50;

export const DEPARTMENT_MESSAGES = {
  required: "Department is mandatory",
  numbers: "Numbers are not allowed",
  special: "Special characters not allowed",
  min: `Department must be at least ${DEPARTMENT_MIN} characters`,
  max: `Department should not exceed ${DEPARTMENT_MAX} characters`,
};

export function validateDepartment(value) {
  const text = normalizeSpaces(value);
  if (!text) return DEPARTMENT_MESSAGES.required;
  if (/\d/.test(text)) return DEPARTMENT_MESSAGES.numbers;
  if (!/^\p{L}+(?: \p{L}+)*$/u.test(text)) return DEPARTMENT_MESSAGES.special;
  if (text.length < DEPARTMENT_MIN) return DEPARTMENT_MESSAGES.min;
  if (text.length > DEPARTMENT_MAX) return DEPARTMENT_MESSAGES.max;
  return "";
}

/* ---------------------------------------------------------- Designation */
export const DESIGNATION_MIN = 2;
export const DESIGNATION_MAX = 60;

export const DESIGNATION_MESSAGES = {
  required: "Designation is mandatory",
  numbers: "Numbers are not allowed",
  special: "Special characters not allowed",
  repeated: "Enter a valid designation",
  min: `Designation must be at least ${DESIGNATION_MIN} characters`,
  max: `Designation should not exceed ${DESIGNATION_MAX} characters`,
};

export function validateDesignation(value) {
  const text = normalizeSpaces(value);
  if (!text) return DESIGNATION_MESSAGES.required;
  if (/\d/.test(text)) return DESIGNATION_MESSAGES.numbers;
  // letters separated by single spaces or single hyphens (e.g. Vice-president)
  if (!/^\p{L}+(?:[ -]\p{L}+)*$/u.test(text)) return DESIGNATION_MESSAGES.special;
  const letters = text.replace(/[ -]/g, "").toLowerCase();
  if (letters.length >= 3 && new Set(letters).size === 1) return DESIGNATION_MESSAGES.repeated; // AAAAAAAA
  if (text.length < DESIGNATION_MIN) return DESIGNATION_MESSAGES.min;
  if (text.length > DESIGNATION_MAX) return DESIGNATION_MESSAGES.max;
  return "";
}

/* ------------------------------------------------- Typing filters
   Each blocked...() answers "why can't this character be typed?" with the
   message to show, or "" when the character is allowed. */
const isLetter = (ch) => /\p{L}/u.test(ch);
const isDigit = (ch) => /\d/.test(ch);

/** Removes the characters a field does not allow. Returns the cleaned text and the reason. */
export function filterTyping(value, blocked) {
  let reason = "";
  const kept = [...(value || "")]
    .filter((ch) => {
      const why = blocked(ch);
      if (why) reason = why;
      return !why;
    })
    .join("");
  return { value: kept, reason };
}

// Name and Department: letters and spaces only.
export const blockedNameChar = (ch) =>
  isLetter(ch) || ch === " " ? "" : isDigit(ch) ? NAME_MESSAGES.numbers : NAME_MESSAGES.special;

export const blockedDepartmentChar = (ch) =>
  isLetter(ch) || ch === " " ? "" : isDigit(ch) ? DEPARTMENT_MESSAGES.numbers : DEPARTMENT_MESSAGES.special;

// Designation: letters, spaces and hyphens.
export const blockedDesignationChar = (ch) =>
  isLetter(ch) || ch === " " || ch === "-"
    ? ""
    : isDigit(ch)
    ? DESIGNATION_MESSAGES.numbers
    : DESIGNATION_MESSAGES.special;

// Employee ID: letters, numbers and hyphens.
export const blockedIdChar = (ch) => (/[A-Za-z0-9-]/.test(ch) ? "" : ID_MESSAGES.invalid);

// Email: no spaces of any kind.
export const blockedEmailChar = (ch) => (/\s/.test(ch) ? EMAIL_MESSAGES.spaces : "");