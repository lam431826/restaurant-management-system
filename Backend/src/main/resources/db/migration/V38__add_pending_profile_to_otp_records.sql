-- V33: pending profile fields on otp_records — first-login verify/info now collects the
-- user's full profile (incl. email, since accounts can be created without one) and stashes it
-- here until verify/otp confirms the OTP, at which point it is committed onto users.

ALTER TABLE otp_records ADD pending_full_name NVARCHAR(150);
ALTER TABLE otp_records ADD pending_email     NVARCHAR(150);
ALTER TABLE otp_records ADD pending_phone     NVARCHAR(20);
