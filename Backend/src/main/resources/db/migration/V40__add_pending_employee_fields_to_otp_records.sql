-- V35: verify/info (first-login flow) now collects the full employee profile up front, not just
-- name/email/phone — add the same pending_* holding pattern V33 introduced for the extra fields,
-- committed onto a linked Employee row by verify/otp once the OTP is confirmed.

ALTER TABLE otp_records ADD pending_start_date DATE;
ALTER TABLE otp_records ADD pending_note        NVARCHAR(1000);
ALTER TABLE otp_records ADD pending_id_number   NVARCHAR(30);
ALTER TABLE otp_records ADD pending_birthday    DATE;
ALTER TABLE otp_records ADD pending_gender      NVARCHAR(10);
ALTER TABLE otp_records ADD pending_address     NVARCHAR(300);
