-- V42: Cash Book (Sổ quỹ) — categories, vouchers, per-fund opening balances.
-- Retires the payroll module's BR-PAY-17 voucher-code stub: payslip_payments.voucher_code
-- (PC%06d) now originates from cashbook_vouchers instead of being self-minted by payroll.

CREATE TABLE cashbook_categories (
    id                    NVARCHAR(36)   NOT NULL PRIMARY KEY,
    code                  NVARCHAR(50)   NULL,            -- set only on system-reserved categories
    name                  NVARCHAR(150)  NOT NULL,
    type                  NVARCHAR(20)   NOT NULL,        -- RECEIPT | PAYMENT
    description           NVARCHAR(500),
    accounting_to_income  BIT            NOT NULL DEFAULT 1,
    created_at            DATETIME2,
    updated_at            DATETIME2
);

CREATE TABLE cashbook_vouchers (
    id                    NVARCHAR(36)   NOT NULL PRIMARY KEY,
    code                  NVARCHAR(20)   NOT NULL UNIQUE,
    type                  NVARCHAR(20)   NOT NULL,        -- RECEIPT | PAYMENT
    occurred_at           DATETIME2      NOT NULL,
    category_id           NVARCHAR(36)   NOT NULL,
    method                NVARCHAR(20)   NOT NULL,        -- CASH | BANK | EWALLET
    partner_group         NVARCHAR(20)   NOT NULL,        -- EMPLOYEE | CUSTOMER | OTHER
    partner_id            NVARCHAR(36),                   -- soft-reference to employees(id); no FK
    partner_name          NVARCHAR(200)  NOT NULL,
    amount                DECIMAL(12, 0) NOT NULL,
    note                  NVARCHAR(500),
    accounting_to_income  BIT            NOT NULL DEFAULT 1,
    source_type           NVARCHAR(20)   NOT NULL DEFAULT 'MANUAL', -- MANUAL | PAYROLL | INVOICE_PAYMENT
    source_reference_id   NVARCHAR(36),
    created_by            NVARCHAR(150),
    voided                BIT            NOT NULL DEFAULT 0,
    created_at            DATETIME2,
    CONSTRAINT fk_cashbook_vouchers_category FOREIGN KEY (category_id) REFERENCES cashbook_categories(id)
);

CREATE TABLE cashbook_opening_balances (
    method                NVARCHAR(20)   NOT NULL PRIMARY KEY, -- CASH | BANK | EWALLET
    amount                DECIMAL(12, 0) NOT NULL DEFAULT 0,
    updated_by            NVARCHAR(150),
    updated_at            DATETIME2
);

-- Filtered index instead of a plain UNIQUE column: SQL Server allows only one NULL per
-- plain UNIQUE constraint, but most categories are manager-created with no reserved code.
CREATE UNIQUE INDEX uq_cashbook_categories_code ON cashbook_categories(code) WHERE code IS NOT NULL;

CREATE INDEX idx_cashbook_vouchers_type       ON cashbook_vouchers(type);
CREATE INDEX idx_cashbook_vouchers_method     ON cashbook_vouchers(method);
CREATE INDEX idx_cashbook_vouchers_category   ON cashbook_vouchers(category_id);
CREATE INDEX idx_cashbook_vouchers_occurred   ON cashbook_vouchers(occurred_at);
CREATE INDEX idx_cashbook_vouchers_source     ON cashbook_vouchers(source_type, source_reference_id);

-- System-reserved categories: looked up by code from the payroll/payment integration hooks.
INSERT INTO cashbook_categories (id, code, name, type, accounting_to_income, created_at, updated_at) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'SALARY_PAYMENT', N'Trả lương nhân viên', 'PAYMENT', 1, SYSUTCDATETIME(), SYSUTCDATETIME()),
    ('c0000000-0000-0000-0000-000000000002', 'SALES_RECEIPT',  N'Thu tiền khách trả',   'RECEIPT', 1, SYSUTCDATETIME(), SYSUTCDATETIME());

-- Manager-editable starter categories (mirrors the previous FE mock's initialCategories).
INSERT INTO cashbook_categories (id, name, type, accounting_to_income, created_at, updated_at) VALUES
    ('c0000000-0000-0000-0000-000000000003', N'Thu khác',              'RECEIPT', 0, SYSUTCDATETIME(), SYSUTCDATETIME()),
    ('c0000000-0000-0000-0000-000000000004', N'Chi phí nguyên liệu',   'PAYMENT', 1, SYSUTCDATETIME(), SYSUTCDATETIME()),
    ('c0000000-0000-0000-0000-000000000005', N'Chi phí điện nước',     'PAYMENT', 1, SYSUTCDATETIME(), SYSUTCDATETIME()),
    ('c0000000-0000-0000-0000-000000000006', N'Chi phí vận hành khác', 'PAYMENT', 1, SYSUTCDATETIME(), SYSUTCDATETIME());

INSERT INTO cashbook_opening_balances (method, amount, updated_at) VALUES
    ('CASH', 0, SYSUTCDATETIME()),
    ('BANK', 0, SYSUTCDATETIME()),
    ('EWALLET', 0, SYSUTCDATETIME());
