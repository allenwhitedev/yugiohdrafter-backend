// uuid password reset key
// corresponding string is user's email
export interface ResetPasswordDict {
    [uuid: string]: string
}

export const resetPasswordDict: ResetPasswordDict = {}