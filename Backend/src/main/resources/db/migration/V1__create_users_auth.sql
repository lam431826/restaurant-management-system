-- V1: Users, Refresh Tokens, OTP Records, Audit Logs

CREATE TABLE users (
    id                    NVARCHAR(36)  NOT NULL PRIMARY KEY,
    username              NVARCHAR(100) NOT NULL UNIQUE,
    password_hash         NVARCHAR(255) NOT NULL,
    full_name             NVARCHAR(150) NOT NULL,
    email                 NVARCHAR(150) UNIQUE,
    phone                 NVARCHAR(20),
    role                  NVARCHAR(20)  NOT NULL,
    status                NVARCHAR(20)  NOT NULL DEFAULT 'UN_ACTIVE',
    failed_login_attempts INT           NOT NULL DEFAULT 0,
    locked_at             DATETIME2,
    created_at            DATETIME2,
    updated_at            DATETIME2
);

CREATE TABLE refresh_tokens (
    id          NVARCHAR(36)  NOT NULL PRIMARY KEY,
    token       NVARCHAR(512) NOT NULL UNIQUE,
    user_id     NVARCHAR(36)  NOT NULL,
    expires_at  DATETIME2     NOT NULL,
    revoked     BIT           NOT NULL DEFAULT 0,
    created_at  DATETIME2,
    CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE otp_records (
    id            NVARCHAR(36)  NOT NULL PRIMARY KEY,
    user_id       NVARCHAR(36)  NOT NULL,
    otp_code      NVARCHAR(6)   NOT NULL,
    verify_token  NVARCHAR(200) NOT NULL UNIQUE,
    expires_at    DATETIME2     NOT NULL,
    attempt_count INT           NOT NULL DEFAULT 0,
    used          BIT           NOT NULL DEFAULT 0,
    created_at    DATETIME2,
    CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE audit_logs (
    id             NVARCHAR(36)  NOT NULL PRIMARY KEY,
    actor_id       NVARCHAR(36)  NOT NULL,
    actor_username NVARCHAR(100) NOT NULL,
    action         NVARCHAR(100) NOT NULL,
    target_entity  NVARCHAR(100),
    target_id      NVARCHAR(36),
    detail         NVARCHAR(MAX),
    ip_address     NVARCHAR(50),
    created_at     DATETIME2
);

CREATE INDEX idx_users_status  ON users(status);
CREATE INDEX idx_users_role    ON users(role);
CREATE INDEX idx_rt_user_id    ON refresh_tokens(user_id);
CREATE INDEX idx_otp_user_id   ON otp_records(user_id);
CREATE INDEX idx_audit_actor   ON audit_logs(actor_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
