# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run with local profile (development)
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Build JAR
mvn clean package

# Run all tests
mvn test

# Run a single test class
mvn test -Dtest=AuthServiceTest

# If enum/constant changes are not picked up, compile first then run separately
mvn clean compile
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

**Swagger UI**: http://localhost:8389/swagger-ui.html  
**OpenAPI spec**: http://localhost:8389/v3/api-docs

> No test classes exist yet (`src/test/` is absent). The `mvn test` command compiles but runs nothing.

## Architecture

**Stack**: Java 17 · Spring Boot 3.2.5 · Spring Security 6 · Spring Data JPA / Hibernate 6 · SQL Server 2022 · Flyway · MapStruct · Lombok · JJWT 0.12.6 · springdoc-openapi 2.5.0

### Package layout

```
com.rms.restaurant
├── common/                    # Cross-cutting infrastructure
│   ├── datasource/            # DataSourceConfig (HikariCP), DataSourceProperties, PlatformDbConfig, RestTemplateConfig
│   ├── config/                # WebMvcConfig (CORS for /api/**)
│   ├── filter/                # JwtAuthenticationFilter, HttpRequestLoggingFilter
│   ├── init/                  # DataSeeder (seeds one user per role on startup)
│   ├── security/              # SecurityConfig, JwtConfig (app.jwt.*), JwtService
│   └── utils/
│       ├── enums/             # UserRole, UserStatus, OrderStatus, TableStatus, ReservationStatus, PaymentMethod, CookingStatus, NotificationChannel
│       ├── exception/         # ApplicationError enum, ApplicationException (base), UnauthorizedException, ForbiddenException, ResourceNotFoundException, ConflictException, RateLimitException, GlobalExceptionHandler
│       ├── mail/              # GmailService (direct SMTP OTP sender via JavaMailSender)
│       └── wrapper/           # ApiResponse<T>, PageResponse<T>
└── module/                    # One sub-package per business domain
    ├── authentication/        # AM-01→AM-06: login, OTP flow, JWT lifecycle
    ├── user/                  # UM-01→UM-04: staff account management
    ├── reservation/           # RM-01→RM-06: internal reservations (Waiter/Manager)
    ├── online_reservation/    # ORM-01→ORM-02: public booking (no auth)
    ├── table/                 # TM-01→TM-04: table management + QR tokens
    ├── guest_ordering/        # GO-01→GO-05: QR-based ordering (table token auth)
    ├── order/                 # OM-01→OM-07: order management (staff)
    ├── payment/               # PM-01→PM-10: invoices, payments, promotions
    ├── shift/                 # SM-01→SM-04: shift management
    ├── menu/                  # MM-01→MM-04: menu & menu items
    ├── reporting/             # RA-01→RA-03: reports & analytics
    ├── notification/          # NM-01→NM-04: email/SMS notifications
    └── integration/           # External clients: MessagingClient, PaymentGatewayClient
```

Each module follows the same internal structure: `config/`, `controller/`, `dto/`, `mapper/`, `model/`, `repository/`, `service/`.

### Implementation status

The scaffolding (entities, DTOs, MapStruct mappers, repository interfaces, Flyway migrations, security config) is complete for all modules. Business logic is partially implemented:

| What is complete | What is a stub |
|---|---|
| All JPA entity models | All `*ServiceImpl` except `AuthServiceImpl` (methods return `null` / TODO) |
| All DTOs and MapStruct mappers | Integration clients (`SendGridMessagingClient`, `TwilioMessagingClient`, `VNPayGatewayClient`) |
| All Spring Data repository interfaces | |
| All module controllers — routing scaffolded for all 16 controllers across all modules | |
| `AuthController` — 9 endpoints: login, refresh, logout, changePassword, verifyInfo, verifyOtp, resendOtp, forgotPassword, resetPassword | |
| `AuthServiceImpl` — all 9 methods fully implemented | |
| `UserController` — 7 endpoints (CRUD + unlock) | |
| Security infrastructure (`SecurityConfig`, `JwtService`, filters, `GlobalExceptionHandler`) | |
| `DataSeeder` — seeds one user per role (`WAITER`, `CASHIER`, `MANAGER`, `ADMIN`) on startup | |
| Flyway migrations V1–V7 (full schema) | |
| `GmailService` — sends OTP emails via SMTP (`JavaMailSender`) | |

### Key design decisions

**Response envelope**:
- Single-object responses: `ApiResponse<T>` (fields: `data`, `message`, `timestamp`)
- Paginated list responses: `PageResponse<T>` returned directly (fields: `data`, `pagination` with `page`, `limit`, `total`, `totalPages`)
- Void operations: `ResponseEntity<Void>` with HTTP 204

**Exception handling** — throw subtypes of `ApplicationException` with an `ApplicationError` enum value (e.g. `throw new UnauthorizedException(ApplicationError.INVALID_CREDENTIALS)`). `ApplicationError` carries a `defaultMessage` and `HttpStatus`. `GlobalExceptionHandler` converts them to `ErrorResponse` with `error`, `message`, `path`, `timestamp`. Validation failures produce a `fieldErrors` map.

Available exception subtypes and their intended use:
- `UnauthorizedException` → 401 (invalid/missing credentials or token)
- `ForbiddenException` → 403 (authenticated but lacking permission)
- `ResourceNotFoundException` → 404 (entity not found by ID)
- `ConflictException` → 409 (duplicate or conflicting state)
- `RateLimitException` → 429 (OTP resend / attempt limits)

`ApplicationError` groups: **Authentication** (`INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `INVALID_OTP`, `OTP_EXPIRED`, `OTP_MAX_ATTEMPTS`, `RESEND_LIMIT_EXCEEDED`, `VERIFY_TOKEN_EXPIRED`, `INVALID_VERIFY_TOKEN`, `INVALID_RESET_TOKEN`), **Resources** (`USER_NOT_FOUND`, `TABLE_NOT_FOUND`, `ORDER_NOT_FOUND`, `RESERVATION_NOT_FOUND`, `INVOICE_NOT_FOUND`, `MENU_ITEM_NOT_FOUND`, `SHIFT_NOT_FOUND`, `PROMOTION_NOT_FOUND`), **Business Rules** (`TABLE_NOT_AVAILABLE`, `INVALID_TABLE_TOKEN`, `SHIFT_ALREADY_OPEN`, `SHIFT_NOT_OPEN`, `CANNOT_CANCEL_PAID_ORDER`, `INVOICE_ALREADY_EXISTS`, `INVALID_STATUS_TRANSITION`, `ORDER_NOT_CLOSEABLE`), **System** (`INTERNAL_ERROR`).

**Database schema** — Hibernate DDL is `validate`; all schema changes go through Flyway scripts in `src/main/resources/db/migration/V*.sql`. Migration files V1–V7 cover users/auth, tables/reservations, menu, orders, payments, shifts, and notification logs. Never use `ddl-auto=update` or `create`.

**Authentication split**:
- Staff → JWT (`Authorization: Bearer <token>`), enforced by `JwtAuthenticationFilter`; method-level rules via `@PreAuthorize`
- In-restaurant guests → table token (from QR code), *not* a JWT; enforced separately in the `guest_ordering` module

**First-login OTP flow** (`UN_ACTIVE → ACTIVE`) — fully implemented:
1. `POST /api/auth/login` → returns `requires_verification: true` + short-lived `verify_token` (stored in `otp_records.verify_token`)
2. `POST /api/auth/verify/info` (header: `X-Verify-Token`) → sends 6-digit OTP via `GmailService` (TTL 5 min); returns `VerifyInfoResponse`
3. `POST /api/auth/verify/otp` → activates account, issues JWT
4. `POST /api/auth/resend-otp` → sends new OTP; capped at 3 resends per 10 min; 5 wrong attempts locks OTP

**Forgot password flow** — fully implemented:
1. `POST /api/auth/forgot-password` (body: `username`) → generates resetToken + OTP, emails OTP via `GmailService`; returns `ForgotPasswordResponse{resetToken, maskedEmail, expiresAt}`
2. `POST /api/auth/reset-password` (header: `X-Reset-Token`, body: `otp` + `newPassword`) → validates OTP, updates password, auto-unlocks LOCKED accounts; returns HTTP 204
- Both endpoints are public (no JWT required). `OtpRecord.verifyToken` field reused to store `resetToken` — no additional Flyway migration needed.
- INACTIVE users are blocked from forgot-password. LOCKED users are auto-set to ACTIVE on success.

**Email sending** — two layers exist; use `GmailService` for OTP:
- `GmailService` (`common/utils/mail/`): direct `JavaMailSender` via `spring.mail.*` config; used for OTP emails (Vietnamese-language template)
- Email failures in `verifyInfo()`, `resendOtp()`, and `forgotPassword()` are caught and logged as warnings — they must not rollback the `@Transactional` method or prevent OTP record from being saved
- `integration/messaging/`: strategy-pattern `MessagingClient` (SendGrid / Twilio); selected by `app.integration.messaging-provider`; used for general notifications

**Roles**: `WAITER`, `CASHIER`, `MANAGER`, `ADMIN` (enum `UserRole`). Authorization uses `@PreAuthorize("hasRole('...')")` or `hasAnyRole(...)`. User IDs are UUID strings generated by JPA (`@GeneratedValue(strategy = GenerationType.UUID)`).

**External integrations** use a strategy pattern: `app.integration.messaging-provider` selects `SendGridMessagingClient` vs `TwilioMessagingClient`; `app.integration.payment-provider` selects `VNPayGatewayClient`. Provider selection lives in `IntegrationConfig` (`@ConfigurationProperties(prefix = "app.integration")`).

**DTO mapping** is done exclusively via MapStruct mapper interfaces. Do not map manually in services.

**`.env` loading** — `spring-dotenv` (me.paulschwarz) is on the classpath; place secrets in a `.env` file at the project root and they are injected as environment variables before Spring resolves `${...}` placeholders.

**Windows JVM flags** — to avoid G1GC paging-file errors on Windows with limited virtual memory, run with:
```
-XX:+UseSerialGC -Xmx256m -Xms64m
```

### Configuration

| File | Purpose |
|------|---------|
| `application.properties` | Production defaults (port 8389, SQL Server, Spring Mail) |
| `application-local.properties` | Local overrides (show-sql, MailHog SMTP on port 1025, verbose logging, `validate-on-migrate=false`) |
| `.env` | Secrets: `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `SENDGRID_API_KEY`, `TWILIO_*`, `VNPAY_*` |

`app.cors.allowed-origins` controls CORS in `WebMvcConfig`; defaults to `http://localhost:3000`. Set to the frontend origin(s) when deploying.

All secrets are injected via `${ENV_VAR:default}` placeholders; never hardcode credentials.

## Git conventions

**Branch naming**: `<type>/<ticket-id>-<short-slug>` — e.g. `feature/rms-001-first-login-verify`, `bugfix/rms-047-otp-not-sending`

**Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat(auth): add OTP resend rate limiting
fix(payment): handle HMAC-SHA256 signature mismatch on webhook
```

Common scopes: `auth`, `users`, `reservations`, `tables`, `menu`, `orders`, `payments`, `shifts`, `notifications`, `reports`, `config`, `db`

**Merge strategy**: squash-merge feature/bugfix branches into `develop`; hotfixes go to both `main` and `develop`.

**IMPORTANT**: Do NOT add `Co-Authored-By:` trailers to any commit message.
