-- OTP fields cho luồng huỷ đặt bàn online (2-bước: request → confirm)
ALTER TABLE reservations
    ADD cancel_token       NVARCHAR(64) NULL,
        cancel_otp         NVARCHAR(6)  NULL,
        cancel_otp_expires DATETIME2    NULL;
