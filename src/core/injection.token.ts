// ----- Repository ports (outbound: the core talking to storage) -----
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const CAR_REPOSITORY = Symbol('CAR_REPOSITORY');
export const OTP_REPOSITORY = Symbol('OTP_REPOSITORY');
export const WAITLIST_REPOSITORY = Symbol('WAITLIST_REPOSITORY');
export const QUOTE_REPOSITORY = Symbol('QUOTE_REPOSITORY');

// ----- Service ports (outbound: the core talking to external services) -----
export const AUTHENTICATION_SERVICE = Symbol('AUTHENTICATION_SERVICE');
export const MAIL_SERVICE = Symbol('MAIL_SERVICE');
