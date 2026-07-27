// Shared across every form that collects an employee's birthday/CMND-CCCD — first-login
// verify/info (LoginPage), self-service "Hồ sơ của tôi" (MyProfile), and manager-side
// create/update (EmployeeModal) — so the rule can't drift between them. Mirrors the backend's
// AgeValidator (common/utils/validation/AgeValidator.java) and the @Pattern on idNumber.

export const AGE_MIN = 18
export const AGE_MAX = 60

export const computeAge = (birthdayISO: string): number => {
  const b = new Date(birthdayISO)
  const today = new Date()
  let age = today.getFullYear() - b.getFullYear()
  const hadBirthdayThisYear =
    today.getMonth() > b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() >= b.getDate())
  if (!hadBirthdayThisYear) age--
  return age
}

/** Empty birthday is allowed (field is optional) — only validates when a value is present. */
export const validateBirthday = (birthdayISO: string): string | undefined => {
  if (!birthdayISO) return undefined
  const age = computeAge(birthdayISO)
  if (age < AGE_MIN || age > AGE_MAX) return `Nhân viên phải từ ${AGE_MIN} đến ${AGE_MAX} tuổi`
  return undefined
}

const ID_NUMBER_PATTERN = /^\d*$/

/** Empty idNumber is allowed (field is optional) — only validates when a value is present. */
export const validateIdNumber = (idNumber: string): string | undefined => {
  if (!idNumber) return undefined
  if (!ID_NUMBER_PATTERN.test(idNumber)) return 'CMND/CCCD chỉ được nhập số, không nhập chữ'
  return undefined
}
