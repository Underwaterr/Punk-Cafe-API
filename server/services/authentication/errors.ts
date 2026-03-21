export const ResetPasswordError = Object.freeze({
  INVALID_CODE: { status: 400, message: 'Invalid reset code' },
  CODE_USED:    { status: 400, message: 'Reset code already used' },
  CODE_EXPIRED: { status: 400, message: 'Reset code expired' },
} as const)
