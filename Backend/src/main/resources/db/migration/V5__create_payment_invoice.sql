-- V5: Promotions, Invoices, Payments, Payment Webhook Logs

CREATE TABLE promotions (
    id               NVARCHAR(36)   NOT NULL PRIMARY KEY,
    code             NVARCHAR(50)   NOT NULL UNIQUE,
    description      NVARCHAR(200)  NOT NULL,
    discount_percent DECIMAL(5, 2),
    discount_amount  DECIMAL(12, 0),
    valid_from       DATE,
    valid_to         DATE,
    active           BIT            NOT NULL DEFAULT 1
);

CREATE TABLE invoices (
    id              NVARCHAR(36)   NOT NULL PRIMARY KEY,
    order_id        NVARCHAR(36)   NOT NULL,
    subtotal        DECIMAL(12, 0) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12, 0),
    total_amount    DECIMAL(12, 0) NOT NULL DEFAULT 0,
    promotion_id    NVARCHAR(36),
    is_paid         BIT            NOT NULL DEFAULT 0,
    created_at      DATETIME2,
    CONSTRAINT fk_inv_order FOREIGN KEY (order_id)     REFERENCES orders(id),
    CONSTRAINT fk_inv_promo FOREIGN KEY (promotion_id) REFERENCES promotions(id)
);

CREATE TABLE payments (
    id          NVARCHAR(36)   NOT NULL PRIMARY KEY,
    invoice_id  NVARCHAR(36)   NOT NULL,
    method      NVARCHAR(20)   NOT NULL,
    amount      DECIMAL(12, 0) NOT NULL,
    gateway_ref NVARCHAR(200),
    status      NVARCHAR(20),
    created_at  DATETIME2,
    CONSTRAINT fk_pay_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE TABLE payment_webhook_logs (
    id          NVARCHAR(36)  NOT NULL PRIMARY KEY,
    provider    NVARCHAR(50)  NOT NULL,
    raw_payload NVARCHAR(MAX) NOT NULL,
    status      NVARCHAR(20)  NOT NULL DEFAULT 'pending',
    received_at DATETIME2
);

CREATE INDEX idx_invoices_order   ON invoices(order_id);
CREATE INDEX idx_invoices_is_paid ON invoices(is_paid);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_status  ON payments(status);
CREATE INDEX idx_promos_code      ON promotions(code);
CREATE INDEX idx_wh_provider      ON payment_webhook_logs(provider);
