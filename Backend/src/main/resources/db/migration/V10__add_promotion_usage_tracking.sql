-- V10: Global promotion usage limits

ALTER TABLE promotions
    ADD usage_limit INT NULL,
        used_count INT NOT NULL CONSTRAINT df_promotions_used_count DEFAULT 0,
        CONSTRAINT ck_promotions_usage_limit CHECK (usage_limit IS NULL OR usage_limit >= 1),
        CONSTRAINT ck_promotions_used_count CHECK (used_count >= 0);
