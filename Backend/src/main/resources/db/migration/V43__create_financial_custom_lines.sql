-- User-managed Chi phí / Thu nhập khác line items for Báo cáo tài chính (P&L). Values are
-- entered per month; quarter/year figures are always a sum of the underlying months.
CREATE TABLE financial_custom_lines (
    id          NVARCHAR(36)  NOT NULL PRIMARY KEY,
    group_type  NVARCHAR(20)  NOT NULL,   -- EXPENSE | OTHER_INCOME
    name        NVARCHAR(200) NOT NULL,
    sort_order  INT           NOT NULL DEFAULT 0,
    created_at  DATETIME2,
    updated_at  DATETIME2
);

CREATE TABLE financial_custom_line_values (
    id              NVARCHAR(36)   NOT NULL PRIMARY KEY,
    custom_line_id  NVARCHAR(36)   NOT NULL,
    year            INT            NOT NULL,
    month           INT            NOT NULL,  -- 1-12
    amount          DECIMAL(14, 0) NOT NULL DEFAULT 0,
    updated_at      DATETIME2,
    CONSTRAINT fk_fin_custom_line_values_line FOREIGN KEY (custom_line_id) REFERENCES financial_custom_lines(id) ON DELETE CASCADE,
    CONSTRAINT uq_fin_custom_line_values UNIQUE (custom_line_id, year, month)
);
