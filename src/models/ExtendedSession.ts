import session from "express-session";

export interface ExtendedSession extends session.Session{
    isAuth: boolean,
    email: string
}