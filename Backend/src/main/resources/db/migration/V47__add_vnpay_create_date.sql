-- V47: persist the exact vnp_CreateDate sent to VNPAY when a payment URL is signed.
--
-- QueryDR requires vnp_TransactionDate to be byte-identical to the vnp_CreateDate of the
-- original pay request. payments.created_at cannot reconstruct it:
--   * created_at is written by JPA auditing in the JVM's default zone, while vnp_CreateDate
--     is formatted in Asia/Ho_Chi_Minh — they agree only on a GMT+7 host, by coincidence;
--   * when an existing unexpired PENDING attempt is reused, a new URL is signed with a new
--     create-date while created_at keeps the original row-insert time, so the two diverge
--     permanently.
--
-- Storing the literal 14-character yyyyMMddHHmmss string removes both problems: what we
-- send is exactly what we later replay to QueryDR.
--
-- Nullable on purpose: VNPAY attempts created before this migration have no recorded
-- create-date and simply cannot be reconciled through QueryDR (reported as a clear error
-- rather than guessed at).

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('payments') AND name = 'vnp_create_date')
    ALTER TABLE payments ADD vnp_create_date NVARCHAR(14) NULL;
