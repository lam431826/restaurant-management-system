-- V23: Fixes for BE-AUTH-01/02/03 (logic review)
-- token_version: bumped on logout/lock/deactivate/password-reset so an already-issued
-- access token can be invalidated server-side before its natural 8h expiry, and so a
-- raw refresh token (which never carries this claim) can never be used as a Bearer token.
IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('users') AND name = 'token_version')
    ALTER TABLE users ADD token_version INT NOT NULL DEFAULT 0;

-- info_request_count: verify/info previously mutated the same OtpRecord row in place,
-- so it was never counted by the same rate limit resend-otp enforces. Tracked separately
-- here so verify/info shares the MAX_RESEND_RECORDS cap without changing the verifyToken
-- contract (no new row, no token rotation).
IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('otp_records') AND name = 'info_request_count')
    ALTER TABLE otp_records ADD info_request_count INT NOT NULL DEFAULT 0;
