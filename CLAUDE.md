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

# Run tests with coverage (Jacoco)
mvn verify
```

**Swagger UI**: http://localhost:8386/swagger-ui.html (or port from active profile)  
**OpenAPI spec**: http://localhost:8386/v3/api-docs

## Architecture

**Stack**: Java 17 · Spring Boot 3.2.x · Spring Security 6 · Spring Data JPA / Hibernate 6 · SQL Server 2022 · Flyway · MapStruct · Lombok

### Package layout

```
com.rms.restaurant
├── common/                    # Cross-cutting infrastructure
│   ├── datasource/            # DataSource, JPA, RestTemplate config
│   ├── filter/                # JwtAuthenticationFilter, HttpRequestLoggingFilter
│   ├── security/              # JwtService
│   └── utils/
│       ├── enums/             # UserRole, UserStatus, OrderStatus, TableStatus, …
│       ├── exception/         # ApplicationException hierarchy + GlobalExceptionHandler
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

### Key design decisions

**Response envelope** — all API responses use `ApiResponse<T>`; paginated results use `PageResponse<T>`.

**Exception handling** — throw subtypes of `ApplicationException` (e.g. `ResourceNotFoundException`, `ForbiddenException`, `UnauthorizedException`); `GlobalExceptionHandler` converts them to the standard envelope.

**Database schema** — Hibernate DDL is set to `validate`; all schema changes must go through Flyway migration scripts in `src/main/resources/db/migration/V*.sql`. Never use `ddl-auto=update` or `create`.

**Authentication split**:
- Staff → JWT (`Authorization: Bearer <token>`), enforced by `JwtAuthenticationFilter`; method-level rules via `@PreAuthorize`
- In-restaurant guests → table token (from QR code), *not* a JWT; enforced separately in the `guest_ordering` module

**First-login OTP flow** (`UN_ACTIVE → ACTIVE`):
1. `POST /api/auth/login` → returns `requires_verification: true` + short-lived `verify_token` (15 min)
2. `POST /api/auth/verify/info` (header: `X-Verify-Token`) → sends 6-digit OTP (TTL: 5 min)
3. `POST /api/auth/verify/otp` → activates account, issues JWT
4. OTP resend capped at 3× per 10 min; 5 wrong attempts locks OTP for 15 min

**External integrations** use a strategy pattern: `app.integration.messaging-provider` selects SendGrid vs Twilio; `app.integration.payment-provider` selects VNPay. Provider selection lives in `IntegrationConfig`.

**DTO mapping** is done exclusively via MapStruct mapper interfaces (e.g. `UserMapper`). Do not map manually in services.

### Configuration

| File | Purpose |
|------|---------|
| `application.properties` | Production defaults (port 8386, SQL Server, SendGrid) |
| `application-local.properties` | Local overrides (show-sql, MailHog, etc.) |
| `.env` | Secrets: `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `SENDGRID_API_KEY`, `TWILIO_*`, `VNPAY_*` |

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
