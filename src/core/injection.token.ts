// ----- Repository ports (outbound: the core talking to storage) -----
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const OTP_REPOSITORY = Symbol('OTP_REPOSITORY');
export const WAITLIST_REPOSITORY = Symbol('WAITLIST_REPOSITORY');
export const QUOTE_REPOSITORY = Symbol('QUOTE_REPOSITORY');
export const SUPPLIER_REPOSITORY = Symbol('SUPPLIER_REPOSITORY');
export const INVITATION_REPOSITORY = Symbol('INVITATION_REPOSITORY');
export const LISTING_REPOSITORY = Symbol('LISTING_REPOSITORY');
export const BRAND_REPOSITORY = Symbol('BRAND_REPOSITORY');
export const SERIES_REPOSITORY = Symbol('SERIES_REPOSITORY');
export const VEHICLE_REPOSITORY = Symbol('VEHICLE_REPOSITORY');
export const INSPECTION_REPOSITORY = Symbol('INSPECTION_REPOSITORY');
export const DEALER_KYC_REPOSITORY = Symbol('DEALER_KYC_REPOSITORY');
export const SAVED_LISTING_REPOSITORY = Symbol('SAVED_LISTING_REPOSITORY');
export const SETTING_REPOSITORY = Symbol('SETTING_REPOSITORY');

// ----- Service ports (outbound: the core talking to external services) -----
export const AUTHENTICATION_SERVICE = Symbol('AUTHENTICATION_SERVICE');
export const MAIL_SERVICE = Symbol('MAIL_SERVICE');
export const MESSAGING_SERVICE = Symbol('MESSAGING_SERVICE');
export const SMS_SERVICE = Symbol('SMS_SERVICE');
export const FILE_STORAGE_SERVICE = Symbol('FILE_STORAGE_SERVICE');
