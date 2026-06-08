<<<<<<< HEAD
# restaurant-management-system
=======
# RMS — Hệ Thống Quản Lý Nhà Hàng

> **Restaurant Management System** · Nền tảng quản lý nhà hàng toàn diện: đặt bàn trực tuyến, gọi món kỹ thuật số, thanh toán đa kênh và phân tích vận hành theo thời gian thực.

---

## Mục Lục

- [1. Giới Thiệu Dự Án](#1-giới-thiệu-dự-án)
- [2. Kiến Trúc Tổng Quan](#2-kiến-trúc-tổng-quan)
- [3. Công Nghệ Sử Dụng](#3-công-nghệ-sử-dụng)
- [4. Cấu Trúc Thư Mục](#4-cấu-trúc-thư-mục)
- [5. Điều Kiện Môi Trường](#5-điều-kiện-môi-trường)
- [6. Hướng Dẫn Cài Đặt](#6-hướng-dẫn-cài-đặt)
- [7. Chạy Local](#7-chạy-local)
- [8. Luồng Xác Thực Thông Tin Lần Đầu Đăng Nhập](#8-luồng-xác-thực-thông-tin-lần-đầu-đăng-nhập)
- [9. API Đặc Tả — Authentication](#9-api-đặc-tả--authentication)
- [10. Kiểm Thử](#10-kiểm-thử)
- [11. Quy Tắc Git Flow](#11-quy-tắc-git-flow)
- [12. Quy Tắc Đặt Tên Branch](#12-quy-tắc-đặt-tên-branch)
- [13. Quy Tắc Commit Message](#13-quy-tắc-commit-message)
- [14. Quy Trình Pull Request](#14-quy-trình-pull-request)
- [15. Biến Môi Trường](#15-biến-môi-trường)
- [16. Coding Standards](#16-coding-standards)
- [17. Checklist Developer Mới](#17-checklist-developer-mới)
- [18. Roadmap Giai Đoạn Đầu](#18-roadmap-giai-đoạn-đầu)
- [19. License](#19-license)

---

## 1. Giới Thiệu Dự Án

**RMS (Restaurant Management System)** là nền tảng quản lý nhà hàng full-stack, phục vụ đồng thời bốn nhóm người dùng:

| Nhóm | Vai trò |
|------|---------|
| **Khách online** | Đặt bàn trước qua website, nhận xác nhận qua email/SMS |
| **Khách tại quán** | Quét QR tại bàn → xem menu, gọi món, yêu cầu hỗ trợ |
| **Thu Ngân (Cashier)** | Quản lý đơn hàng, tính tiền, xử lý thanh toán đa kênh, quản lý ca |
| **Quản Lý (Manager/Admin)** | Quản lý menu, nhân viên, ca làm, báo cáo doanh thu, phân tích |

**Điểm nổi bật:**
- Xác thực thông tin tài khoản khi đăng nhập lần đầu (email + số điện thoại → OTP) với vòng đời `UN_ACTIVE → ACTIVE`
- Cập nhật trạng thái bàn theo thời gian thực qua WebSocket (SockJS + STOMP)
- Tích hợp Payment Gateway (VNPay / MoMo) với Webhook HMAC-SHA256
- Thông báo tự động qua Email (JavaMail / SendGrid) và SMS
- Báo cáo doanh thu, phân tích lượng khách, hiệu quả menu xuất PDF/Excel

---

## 2. Kiến Trúc Tổng Quan

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│   Browser (React SPA)                   QR Mobile (React)   │
└────────────────────┬────────────────────────────┬───────────┘
                     │ HTTP/HTTPS                  │ HTTP/HTTPS
┌────────────────────▼────────────────────────────▼───────────┐
│                  Spring Boot API Server (:8080)               │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────────┐ │
│  │   Auth    │ │Reservation│ │  Orders   │ │  Payments   │ │
│  │ (AM-01~06)│ │(RM-01~06) │ │(OM-01~07) │ │ (PM-01~10)  │ │
│  └───────────┘ └───────────┘ └───────────┘ └─────────────┘ │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────────┐ │
│  │  Tables   │ │   Menu    │ │  Shifts   │ │Notifications│ │
│  │(TM-01~04) │ │(MM-01~04) │ │(SM-01~04) │ │ (NM-01~04)  │ │
│  └───────────┘ └───────────┘ └───────────┘ └─────────────┘ │
└──────────────┬──────────────────────────────────────────────┘
               │ JDBC / JPA
┌──────────────▼──────────────────────────────────────────────┐
│               SQL Server 2022 (local, port 1433)             │
│         Database: rms_db  · Schema: dbo                      │
└──────────────────────────────────────────────────────────────┘
```

**Luồng xác thực người dùng:**

```
Admin tạo TK ──────────→ status: UN_ACTIVE
                               │
User login lần đầu ────────────┤ POST /api/auth/login
                               │ ↳ 200 { requires_verification: true, verify_token }
                               │
Frontend hiện Form ────────────┤ Nhập / xác nhận Email + Số điện thoại
xác thực thông tin             │
                               │
Gửi thông tin ─────────────────┤ POST /api/auth/verify/info
                               │ ↳ 200 { message: "OTP đã được gửi" }
                               │
System gửi OTP ────────────────┤ Email + SMS (TTL: 5 phút)
                               │
User nhập OTP ─────────────────┤ POST /api/auth/verify/otp
                               │ ↳ status: ACTIVE + Access Token (8h) + Refresh Token (7d)
                               ▼
                   Sử dụng bình thường (all protected APIs)
```

**Luồng đăng nhập bình thường (đã ACTIVE):**

```
POST /api/auth/login
↳ 200 { access_token, refresh_token, user }
```

---

## 3. Công Nghệ Sử Dụng

### Backend

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|---------|
| **Java** | 17 LTS (Temurin) | Runtime |
| **Spring Boot** | 3.2.x | API Framework |
| **Spring Security** | 6.x | Authentication & Authorization |
| **Spring Data JPA** | 3.x | ORM / Repository layer |
| **Hibernate** | 6.x | JPA implementation |
| **Flyway** | (tích hợp Boot) | Database migrations |
| **Microsoft JDBC Driver** | 12.x | SQL Server connector |
| **jjwt** | 0.12.x | JWT (Access + Refresh token) |
| **JavaMailSender** | — | Gửi email OTP |
| **Lombok** | 1.18.x | Giảm boilerplate code |
| **MapStruct** | 1.6.x | Entity ↔ DTO mapping |
| **SpringDoc OpenAPI** | 2.x | Swagger UI / API docs |
| **Spring Validation** | — | DTO validation |
| **Maven** | 3.9.14 | Build tool |

### Frontend

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|---------|
| **React** | 18.x | UI Framework |
| **Vite** | 5.x | Build tool |
| **TypeScript** | 5.x | Ngôn ngữ chính |
| **TanStack Query** | 5.x | Server state management |
| **Zustand** | 4.x | Client state management |
| **React Router** | 6.x | Routing |
| **Tailwind CSS** | 3.x | Styling |
| **shadcn/ui** | — | UI Component library |
| **Axios** | 1.x | HTTP client |
| **React Hook Form** | — | Form management |
| **Zod** | — | Schema validation |
| **SockJS + STOMP** | — | WebSocket client (real-time) |
| **Node.js** | 24 LTS | Runtime / tooling |
| **npm** | 11.x | Package manager |

### Cơ sở dữ liệu & Công cụ

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|---------|
| **SQL Server** | 2022 (16.x) | Cơ sở dữ liệu chính |
| **SQL Server Management Studio** | 20.x | Database GUI |
| **Git** | 2.40+ | Version control |
| **VS Code / IntelliJ IDEA** | Latest | IDE |

---

## 4. Cấu Trúc Thư Mục

```
rms/
├── backend/                                # Spring Boot API (Feature-Based Architecture)
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/rms/restaurant/
│   │   │   │   ├── common/                 # Cross-cutting concerns
│   │   │   │   │   ├── datasource/         # DataSource, JPA, RestTemplate config
│   │   │   │   │   │   ├── DataSourceConfig.java
│   │   │   │   │   │   ├── DataSourceProperties.java
│   │   │   │   │   │   ├── PlatformDbConfig.java
│   │   │   │   │   │   └── RestTemplateConfig.java
│   │   │   │   │   ├── filter/             # Servlet filters
│   │   │   │   │   │   ├── JwtAuthenticationFilter.java
│   │   │   │   │   │   └── HttpRequestLoggingFilter.java
│   │   │   │   │   └── utils/
│   │   │   │   │       ├── enums/          # UserStatus, OrderStatus, TableStatus ...
│   │   │   │   │       ├── exception/      # ApplicationException, GlobalExceptionHandler
│   │   │   │   │       └── wrapper/        # ApiResponse<T>, PageResponse<T>
│   │   │   │   │
│   │   │   │   ├── module/                 # Business modules (one per feature)
│   │   │   │   │   ├── authentication/     # AM-01→AM-06: Login, OTP, JWT lifecycle
│   │   │   │   │   │   ├── config/         # SecurityConfig, JwtConfig, WebMvcConfig
│   │   │   │   │   │   ├── controller/     # AuthController
│   │   │   │   │   │   ├── dto/            # LoginRequest, VerifyOtpRequest ...
│   │   │   │   │   │   ├── mapper/         # UserMapper
│   │   │   │   │   │   ├── model/          # User, RefreshToken, OtpRecord (@Entity)
│   │   │   │   │   │   ├── repository/     # UserRepository, OtpRecordRepository
│   │   │   │   │   │   └── service/        # AuthService, JwtService
│   │   │   │   │   ├── user/               # UM-01→UM-04: Staff account management
│   │   │   │   │   ├── reservation/        # RM-01→RM-06: Internal reservations
│   │   │   │   │   ├── online_reservation/ # ORM-01→ORM-02: Public booking
│   │   │   │   │   ├── table/              # TM-01→TM-04: Table management
│   │   │   │   │   ├── guest_ordering/     # GO-01→GO-05: QR ordering (Table Token)
│   │   │   │   │   ├── order/              # OM-01→OM-07: Order management
│   │   │   │   │   ├── payment/            # PM-01→PM-10: Invoice, payment, promotions
│   │   │   │   │   ├── shift/              # SM-01→SM-04: Shift management
│   │   │   │   │   ├── menu/               # MM-01→MM-04: Menu management
│   │   │   │   │   ├── reporting/          # RA-01→RA-03: Reports & analytics
│   │   │   │   │   ├── notification/       # NM-01→NM-04: Email/SMS notifications
│   │   │   │   │   └── integration/        # External: MessagingClient, PaymentGatewayClient
│   │   │   │   │
│   │   │   │   └── RmsApplication.java     # @SpringBootApplication entry point
│   │   │   │
│   │   │   └── resources/
│   │   │       ├── application.properties
│   │   │       ├── application-local.properties
│   │   │       └── db/migration/           # Flyway SQL scripts
│   │   │           ├── V1__create_users_auth.sql
│   │   │           ├── V2__create_tables_reservations.sql
│   │   │           ├── V3__create_menu.sql
│   │   │           ├── V4__create_orders.sql
│   │   │           ├── V5__create_payment_invoice.sql
│   │   │           ├── V6__create_shift.sql
│   │   │           └── V7__create_notification_log.sql
│   │   └── test/java/com/rms/restaurant/
│   └── pom.xml
│
├── frontend/                               # React + Vite SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── VerifyInfoPage.tsx      # Form nhập email + SĐT lần đầu
│   │   │   │   └── VerifyOtpPage.tsx       # Nhập mã OTP
│   │   │   ├── cashier/
│   │   │   ├── admin/
│   │   │   ├── online/
│   │   │   └── guest/
│   │   ├── components/
│   │   │   ├── ui/                         # shadcn/ui base
│   │   │   └── shared/
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useVerification.ts
│   │   ├── services/
│   │   │   ├── api.ts                      # Axios instance + interceptors
│   │   │   └── auth.service.ts
│   │   ├── store/
│   │   │   └── authStore.ts                # Zustand: user, tokens, verify state
│   │   ├── types/
│   │   └── router/
│   │       └── index.tsx                   # Protected routes + verify guard
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
└── README.md
```

---

## 5. Điều Kiện Môi Trường

Đảm bảo các công cụ sau đã được cài đặt:

| Công cụ | Phiên bản | Kiểm tra |
|---------|-----------|---------|
| **Java (JDK)** | 17 LTS | `java -version` |
| **Maven** | 3.9.x | `mvn -version` |
| **Node.js** | 24 LTS | `node --version` |
| **npm** | 11.x | `npm --version` |
| **SQL Server** | 2022 (Local/Express) | `sqlcmd -S localhost -Q "SELECT @@VERSION"` |
| **Git** | 2.40+ | `git --version` |

> Phiên bản đã xác nhận trên máy: Java 21.0.11, Maven 3.9.14, Node.js 24.14.0, npm 11.9.0, SQL Server 2022 (sqlcmd 16.0).

### VS Code Extensions (khuyến nghị)

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "eamodio.gitlens",
    "ms-mssql.mssql"
  ]
}
```

---

## 6. Hướng Dẫn Cài Đặt

### Bước 1: Clone repository

```bash
git clone https://github.com/your-org/rms.git
cd rms
```

### Bước 2: Tạo database SQL Server

Kết nối SQL Server Management Studio (SSMS) hoặc `sqlcmd`, chạy:

```sql
CREATE DATABASE rms_db;
GO

-- Tạo login và user (tuỳ chọn, hoặc dùng Windows Authentication)
CREATE LOGIN rms_user WITH PASSWORD = 'YourPassword@123';
USE rms_db;
CREATE USER rms_user FOR LOGIN rms_user;
ALTER ROLE db_owner ADD MEMBER rms_user;
GO
```

### Bước 3: Cấu hình backend

```bash
# Copy file cấu hình mẫu
copy backend\src\main\resources\application.properties.example ^
     backend\src\main\resources\application-local.properties

# Chỉnh sửa connection string và các biến
code backend\src\main\resources\application-local.properties
```

Xem chi tiết tại [mục 15](#15-biến-môi-trường).

### Bước 4: Khởi tạo cơ sở dữ liệu (Flyway tự động)

Flyway chạy migration tự động khi Spring Boot khởi động. Các script nằm tại:
`backend/src/main/resources/db/migration/V*.sql`

### Bước 5: Cài đặt frontend dependencies

```bash
cd frontend
npm install
```

### Bước 6: Xác nhận cài đặt thành công

```bash
# Backend — chạy test kết nối
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Kiểm tra Swagger UI: http://localhost:8080/swagger-ui.html
```

---

## 7. Chạy Local

### Chạy Backend (Spring Boot)

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

### Chạy Frontend (React + Vite)

```bash
cd frontend
npm run dev
```

### Endpoints sau khi khởi động

| Service | URL | Ghi chú |
|---------|-----|---------|
| **Frontend** | http://localhost:5173 | React SPA |
| **Backend API** | http://localhost:8080 | Spring Boot REST API |
| **Swagger UI** | http://localhost:8080/swagger-ui.html | API Documentation |
| **WebSocket** | ws://localhost:8080/ws | Real-time (SockJS + STOMP) |

### Tài khoản mặc định (sau khi chạy seed V3)

| Role | Username | Password | Status |
|------|----------|----------|--------|
| Admin | `admin` | `Admin@123456` | ACTIVE |
| Manager | `manager01` | `Manager@123456` | UN_ACTIVE |
| Cashier | `cashier01` | `Cashier@123456` | UN_ACTIVE |
| Waiter | `waiter01` | `Waiter@123456` | UN_ACTIVE |

> Tài khoản `UN_ACTIVE` sẽ được yêu cầu xác thực thông tin (email + SĐT) khi đăng nhập lần đầu.

---

## 8. Luồng Xác Thực Thông Tin Lần Đầu Đăng Nhập

Khi Admin tạo tài khoản, tài khoản mặc định có status `UN_ACTIVE`. Người dùng **bắt buộc** xác thực thông tin cá nhân trước khi sử dụng hệ thống.

### Sơ đồ luồng

```
[Trang Login]
     │
     │ Nhập username + password
     ▼
POST /api/auth/login
     │
     ├─── status = ACTIVE ──────────────────→ [Dashboard] (bình thường)
     │
     └─── status = UN_ACTIVE ──────────────→ [Trang Xác Thực Thông Tin]
               │                              (requires_verification: true)
               │
               │ Form: Email + Số điện thoại
               │ (điền vào nếu chưa có, hoặc xác nhận nếu đã có)
               ▼
     POST /api/auth/verify/info
               │
               ▼
     System gửi OTP qua Email + SMS (TTL: 5 phút)
               │
               ▼
          [Trang Nhập OTP]
               │
               │ Nhập mã 6 số
               ▼
     POST /api/auth/verify/otp
               │
               ├─── Hợp lệ ──→ status → ACTIVE → Trả JWT → [Dashboard]
               │
               └─── Sai / Hết hạn ──→ Thông báo lỗi, cho nhập lại
                                        (tối đa 5 lần, sau đó khoá 15 phút)
```



## 9. API Đặc Tả — Authentication

Base URL: `http://localhost:8080/api`

---

### AM-01: Đăng nhập

**`POST /api/auth/login`**

Đăng nhập bằng username và password. Nếu tài khoản `UN_ACTIVE`, trả về yêu cầu xác thực thông tin thay vì JWT.

**Request Body:**
```json
{
  "username": "cashier01",
  "password": "Cashier@123456"
}
```

**Response — Tài khoản đã ACTIVE (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 28800,
  "user": {
    "id": 5,
    "username": "cashier01",
    "full_name": "Nguyễn Văn A",
    "role": "CASHIER",
    "status": "ACTIVE"
  }
}
```

**Response — Tài khoản UN_ACTIVE, cần xác thực lần đầu (200):**
```json
{
  "requires_verification": true,
  "verify_token": "vt_a1b2c3d4e5f6...",
  "message": "Tài khoản chưa được kích hoạt. Vui lòng xác thực thông tin.",
  "prefilled": {
    "email": "u***@example.com",
    "phone": "090*****67"
  }
}
```

> `verify_token` là token tạm thời (TTL: 15 phút), dùng cho các bước xác thực tiếp theo. Lưu vào `sessionStorage` ở frontend.
>
> `prefilled` chứa email/SĐT đã che một phần (nếu Admin đã nhập trước). Frontend hiển thị để user xác nhận hoặc điền mới.

**Response — Sai thông tin (401):**
```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "Tên đăng nhập hoặc mật khẩu không đúng."
}
```

**Response — Tài khoản bị khoá (403):**
```json
{
  "error": "ACCOUNT_LOCKED",
  "message": "Tài khoản đã bị khoá. Liên hệ quản trị viên.",
  "locked_until": null
}
```

---

### AM-02: Xác Thực Thông Tin Lần Đầu (Gửi OTP)

**`POST /api/auth/verify/info`**

User gửi email và số điện thoại. Hệ thống xác nhận thông tin và gửi OTP.

**Headers:**
```
X-Verify-Token: vt_a1b2c3d4e5f6...
```

**Request Body:**
```json
{
  "email": "nguyen.vana@example.com",
  "phone": "0901234567"
}
```

**Validation:**
- `email`: định dạng email hợp lệ, bắt buộc
- `phone`: 10–11 chữ số, bắt đầu bằng 0, bắt buộc

**Response — Thành công (200):**
```json
{
  "message": "Mã OTP đã được gửi đến email và số điện thoại của bạn.",
  "otp_sent_to": {
    "email": "n***@example.com",
    "phone": "090*****67"
  },
  "expires_in_seconds": 300,
  "resend_remaining": 3
}
```

**Response — verify_token hết hạn hoặc không hợp lệ (401):**
```json
{
  "error": "INVALID_VERIFY_TOKEN",
  "message": "Phiên xác thực hết hạn. Vui lòng đăng nhập lại."
}
```

**Response — Email/SĐT đã được dùng bởi tài khoản khác (409):**
```json
{
  "error": "CONTACT_ALREADY_USED",
  "field": "email",
  "message": "Email này đã được sử dụng bởi tài khoản khác."
}
```

---

### AM-03: Xác Thực OTP — Kích Hoạt Tài Khoản

**`POST /api/auth/verify/otp`**

User nhập mã OTP 6 chữ số. Nếu hợp lệ, tài khoản chuyển sang `ACTIVE` và trả về JWT.

**Headers:**
```
X-Verify-Token: vt_a1b2c3d4e5f6...
```

**Request Body:**
```json
{
  "otp": "847291"
}
```

**Response — Thành công, tài khoản được kích hoạt (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 28800,
  "user": {
    "id": 5,
    "username": "cashier01",
    "full_name": "Nguyễn Văn A",
    "email": "nguyen.vana@example.com",
    "phone": "0901234567",
    "role": "CASHIER",
    "status": "ACTIVE"
  },
  "message": "Tài khoản đã được kích hoạt thành công."
}
```

**Response — OTP sai (400):**
```json
{
  "error": "INVALID_OTP",
  "message": "Mã OTP không đúng.",
  "attempts_remaining": 3
}
```

**Response — OTP hết hạn (400):**
```json
{
  "error": "OTP_EXPIRED",
  "message": "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại."
}
```

**Response — Vượt quá số lần thử (429):**
```json
{
  "error": "OTP_MAX_ATTEMPTS",
  "message": "Vượt quá số lần thử. Tài khoản bị tạm khoá.",
  "locked_until": "2025-06-05T10:30:00Z",
  "locked_for_seconds": 900
}
```

---

### AM-04: Gửi Lại OTP

**`POST /api/auth/verify/resend`**

Yêu cầu gửi lại OTP khi OTP cũ đã hết hạn hoặc không nhận được.

**Headers:**
```
X-Verify-Token: vt_a1b2c3d4e5f6...
```

**Request Body:** _(không cần body)_

**Response — Thành công (200):**
```json
{
  "message": "Mã OTP mới đã được gửi.",
  "expires_in_seconds": 300,
  "resend_remaining": 2
}
```

**Response — Vượt quá giới hạn gửi lại (429):**
```json
{
  "error": "RESEND_LIMIT_EXCEEDED",
  "message": "Đã vượt quá số lần gửi lại OTP. Vui lòng thử lại sau.",
  "retry_after_seconds": 600
}
```

---

### AM-05: Làm Mới Token

**`POST /api/auth/refresh`**

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 28800
}
```

---

### AM-06: Đăng Xuất

**`POST /api/auth/logout`**

**Headers:** `Authorization: Bearer <access_token>`

**Response (204):** _(No Content — token bị vô hiệu hoá phía server)_

---

### Bảng Tóm Tắt API Auth

| # | Method | Endpoint | Auth | Mô tả |
|---|--------|----------|------|-------|
| AM-01 | POST | `/api/auth/login` | Public | Đăng nhập |
| AM-02 | POST | `/api/auth/verify/info` | verify_token | Gửi email + SĐT, nhận OTP |
| AM-03 | POST | `/api/auth/verify/otp` | verify_token | Nhập OTP, kích hoạt tài khoản |
| AM-04 | POST | `/api/auth/verify/resend` | verify_token | Gửi lại OTP |
| AM-05 | POST | `/api/auth/refresh` | Public | Làm mới access token |
| AM-06 | POST | `/api/auth/logout` | JWT | Đăng xuất |

---

### Quy tắc OTP

| Tham số | Giá trị |
|---------|---------|
| Độ dài OTP | 6 chữ số |
| TTL | 5 phút (300 giây) |
| Số lần thử tối đa | 5 lần |
| Khoá tạm thời khi vượt | 15 phút (900 giây) |
| Số lần gửi lại tối đa | 3 lần / 10 phút |
| verify_token TTL | 15 phút |

---

## 10. Kiểm Thử

### Cấu trúc test

```
backend/src/test/java/com/rms/
├── auth/
│   ├── AuthControllerTest.java     # Unit test controller
│   ├── AuthServiceTest.java        # Unit test service
│   └── AuthIntegrationTest.java    # Integration test (H2 in-memory)
└── ...
```

### Chạy test backend

```bash
cd backend

# Tất cả tests
mvn test

# Test với coverage (Jacoco)
mvn verify

# Một test class cụ thể
mvn test -Dtest=AuthServiceTest
```

### Chạy test frontend

```bash
cd frontend

# Unit tests (Vitest)
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run coverage
```

### Mục tiêu coverage

| Loại | Mục tiêu |
|------|---------|
| Unit tests Backend | ≥ 80% |
| Unit tests Frontend | ≥ 70% |
| Integration tests | Happy path + luồng verify |

---

## 11. Quy Tắc Git Flow

```
main ─────────────────────────────────────── (production-ready)
  │
  └─── develop ─────────────────────────── (integration)
           │
           ├─── feature/rms-001-login
           ├─── feature/rms-002-verify-info
           ├─── bugfix/rms-015-otp-expired
           └─── hotfix/rms-099-payment-crash
```

| Branch | Quy tắc |
|--------|---------|
| `main` | Chỉ nhận merge từ `release/*` hoặc `hotfix/*`. Không push trực tiếp. |
| `develop` | Nhánh tích hợp chính. Feature branch merge vào đây sau review. |
| `feature/*` | Tạo từ `develop`, merge về `develop` qua Pull Request. |
| `bugfix/*` | Tạo từ `develop`, merge về `develop` qua Pull Request. |
| `hotfix/*` | Tạo từ `main`, merge về cả `main` và `develop`. |

---

## 12. Quy Tắc Đặt Tên Branch

**Cú pháp:** `<type>/<ticket-id>-<slug-mo-ta-ngan>`

| Type | Khi nào dùng | Ví dụ |
|------|-------------|-------|
| `feature/` | Tính năng mới | `feature/rms-001-first-login-verify` |
| `bugfix/` | Sửa bug trên develop | `bugfix/rms-047-otp-not-sending` |
| `hotfix/` | Sửa khẩn cấp | `hotfix/rms-099-payment-webhook-fail` |
| `chore/` | Cấu hình, CI | `chore/rms-010-update-spring-boot` |
| `docs/` | Tài liệu | `docs/rms-012-update-api-spec` |
| `refactor/` | Tái cấu trúc | `refactor/rms-020-auth-service` |

**Quy tắc:** viết thường, dùng `-`, có ticket ID, tối đa 50 ký tự slug.

---

## 13. Quy Tắc Commit Message

Dự án tuân theo **[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)**.

**Cú pháp:**
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

| Type | Khi nào dùng |
|------|-------------|
| `feat` | Thêm tính năng mới |
| `fix` | Sửa bug |
| `docs` | Thay đổi tài liệu |
| `refactor` | Tái cấu trúc, không thêm tính năng / sửa bug |
| `test` | Thêm hoặc sửa test |
| `chore` | Cập nhật build tools, dependencies |

**Scope thường dùng:** `auth`, `users`, `reservations`, `tables`, `menu`, `orders`, `payments`, `shifts`, `notifications`, `reports`, `ui`, `config`, `db`

**Ví dụ hợp lệ:**
```bash
feat(auth): add first-time login info verification flow

Implements UN_ACTIVE → ACTIVE status transition:
- POST /api/auth/verify/info: submit email + phone, send OTP
- POST /api/auth/verify/otp: validate OTP, activate account
- POST /api/auth/verify/resend: resend with rate limiting (3/10min)
- verify_token (15min TTL) used across verification steps

Closes #42

fix(auth): handle OTP expiry check before attempt count

docs(readme): rewrite for Spring Boot + React + SQL Server stack
```

---

## 14. Quy Trình Pull Request

### Trước khi tạo PR

```bash
# Cập nhật từ develop
git fetch origin
git rebase origin/develop

# Chạy kiểm tra
cd backend && mvn test
cd frontend && npm run lint && npm run test
```

### PR Template

```markdown
## Mô tả thay đổi
<!-- Mô tả ngắn gọn những gì đã thay đổi và tại sao -->

## Liên kết
- Closes #[Issue ID]

## Cách kiểm thử
- [ ] Bước 1
- [ ] Bước 2

## Checklist
- [ ] Code tuân theo coding standards
- [ ] Đã viết / cập nhật unit tests
- [ ] Coverage không giảm
- [ ] Không có debug log / System.out.println bị bỏ sót
- [ ] Đã cập nhật tài liệu nếu cần
- [ ] Đã self-review toàn bộ diff
```

| Quy tắc | Chi tiết |
|---------|---------|
| Số approvals | 1 reviewer (2 cho hotfix) |
| CI phải pass | Tất cả tests phải xanh trước khi merge |
| Không self-merge | Không được merge PR của chính mình |
| Squash merge | Dùng "Squash and merge" để giữ history sạch |

---

## 15. Biến Môi Trường

### Backend (`backend/src/main/resources/application-local.properties`)

```properties
# ── Application ─────────────────────────────────────────────
spring.profiles.active=local
server.port=8080
frontend.url=http://localhost:5173

# ── SQL Server ───────────────────────────────────────────────
spring.datasource.url=jdbc:sqlserver://localhost:1433;databaseName=rms_db;encrypt=false
spring.datasource.username=rms_user
spring.datasource.password=YourPassword@123
spring.datasource.driver-class-name=com.microsoft.sqlserver.jdbc.SQLServerDriver

# JPA / Hibernate
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.SQLServerDialect

# Flyway
spring.flyway.enabled=true
spring.flyway.baseline-on-migrate=true

# ── JWT ──────────────────────────────────────────────────────
jwt.secret=<min-64-char-random-string>
jwt.expiration-ms=28800000
jwt.refresh-secret=<different-min-64-char-random-string>
jwt.refresh-expiration-ms=604800000

# verify_token
jwt.verify-token-expiration-ms=900000

# ── OTP ──────────────────────────────────────────────────────
otp.length=6
otp.ttl-seconds=300
otp.max-attempts=5
otp.lockout-seconds=900
otp.resend-limit=3
otp.resend-window-seconds=600

# ── Email (JavaMail / Gmail SMTP) ────────────────────────────
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-password
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
mail.from=noreply@rms.local
mail.from-name=RMS – Nhà Hàng

# ── SMS (tuỳ chọn — ESMS hoặc Twilio) ───────────────────────
sms.provider=esms
esms.api-key=xxxxxxxxxxxxx
esms.secret-key=xxxxxxxxxxxxx
esms.brand-name=RMS

# ── Logging ──────────────────────────────────────────────────
logging.level.com.rms=DEBUG
logging.level.org.springframework.security=INFO
```

### Frontend (`frontend/.env.local`)

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws
VITE_APP_NAME=RMS – Quản Lý Nhà Hàng
```

> Không commit file `application-local.properties` hoặc `.env.local` lên Git. Thêm vào `.gitignore`.

---

## 16. Coding Standards

### Java / Spring Boot

```java
// DTO với validation
public record LoginRequest(
    @NotBlank(message = "Username không được để trống")
    String username,

    @NotBlank(message = "Password không được để trống")
    @Size(min = 8, message = "Password tối thiểu 8 ký tự")
    String password
) {}

// Controller — không chứa business logic
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/verify/info")
    public ResponseEntity<VerifyInfoResponse> verifyInfo(
            @RequestHeader("X-Verify-Token") String verifyToken,
            @Valid @RequestBody VerifyInfoRequest request) {
        return ResponseEntity.ok(authService.submitVerifyInfo(verifyToken, request));
    }
}

// Entity
@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Enumerated(EnumType.STRING)
    private UserStatus status; // UN_ACTIVE, ACTIVE, INACTIVE, LOCKED
}
```

### React / TypeScript

```tsx
// Trang xác thực thông tin lần đầu
interface VerifyInfoFormValues {
  email: string;
  phone: string;
}

const verifyInfoSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().regex(/^0\d{9,10}$/, "Số điện thoại không hợp lệ"),
});

export function VerifyInfoPage() {
  const { verifyToken } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<VerifyInfoFormValues>({
    resolver: zodResolver(verifyInfoSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: VerifyInfoFormValues) =>
      authService.submitVerifyInfo(verifyToken!, data),
    onSuccess: () => navigate("/verify-otp"),
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
      {/* form fields */}
    </form>
  );
}

// Protected route với verify guard
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, requiresVerification } = useAuthStore();
  if (!user) return <Navigate to="/login" />;
  if (requiresVerification) return <Navigate to="/verify-info" />;
  return children;
}
```

### Đặt tên

| Thành phần | Quy tắc | Ví dụ |
|-----------|---------|-------|
| Java class | `PascalCase` | `AuthService`, `OtpToken` |
| Java method | `camelCase` | `submitVerifyInfo` |
| Java constant | `UPPER_SNAKE_CASE` | `MAX_OTP_ATTEMPTS` |
| SQL table | `snake_case` | `otp_tokens`, `users` |
| React component | `PascalCase` | `VerifyInfoPage` |
| React hook | `camelCase` bắt đầu `use` | `useVerification` |
| TS interface | `PascalCase` | `LoginResponse` |

---

## 17. Checklist Developer Mới

### Ngày 1 — Setup & Tìm hiểu

- [ ] Clone repo và hoàn thành cài đặt theo [mục 6](#6-hướng-dẫn-cài-đặt)
- [ ] Tạo database `rms_db` trên SQL Server local
- [ ] Chạy backend thành công: `http://localhost:8080/swagger-ui.html` mở được
- [ ] Chạy frontend thành công: `http://localhost:5173` mở được
- [ ] Đọc toàn bộ README này
- [ ] Đọc tài liệu `docs/API_Spec.docx` và `docs/Function_List.xlsx`
- [ ] Thử login với tài khoản `manager01` → trải qua luồng verify info + OTP
- [ ] Truy cập Swagger UI và thử ít nhất 3 API

### Ngày 2 — Deep Dive & Contribution

- [ ] Hiểu luồng `UN_ACTIVE → ACTIVE` (mục 8 + mục 9)
- [ ] Đọc `AuthService.java` và `OtpService.java`
- [ ] Hiểu `JwtAuthFilter` và cách `X-Verify-Token` hoạt động
- [ ] Chạy toàn bộ test: `mvn test` (backend), `npm run test` (frontend)
- [ ] Tạo branch thử nghiệm và commit đầu tiên theo Conventional Commits
- [ ] Tham gia pair programming với team lead

---

## 18. Roadmap Giai Đoạn Đầu

### Sprint 1 (Tuần 1–2): Foundation

| # | Tính năng | Use Case | Priority |
|---|-----------|----------|---------|
| 1 | Xác thực & phân quyền (Login, Verify Info, OTP, JWT) | AM-01 → AM-06 | Critical |
| 2 | Quản lý người dùng (CRUD) | UM-01 → UM-04 | Critical |
| 3 | Quản lý thực đơn | MM-01 → MM-03 | Critical |
| 4 | Sơ đồ bàn — xem & cập nhật trạng thái | TM-01, TM-02 | Critical |

### Sprint 2 (Tuần 3–4): Core Flows

| # | Tính năng | Use Case | Priority |
|---|-----------|----------|---------|
| 1 | Đặt bàn trực tuyến | ORM-01, ORM-02 | High |
| 2 | Quản lý đặt bàn nội bộ + Check-in | RM-01 → RM-06 | High |
| 3 | QR Ordering: Menu → Giỏ hàng → Gửi đơn | GO-01 → GO-05 | High |
| 4 | Quản lý đơn hàng (Cashier dashboard) | OM-01 → OM-07 | High |
| 5 | WebSocket — cập nhật bàn và đơn hàng real-time | TM-03 | High |

### Sprint 3 (Tuần 5–6): Payment & Operations

| # | Tính năng | Use Case | Priority |
|---|-----------|----------|---------|
| 1 | Tạo hóa đơn, thanh toán | PM-01 → PM-05 | High |
| 2 | Tích hợp VNPay + Webhook | PM-03 | High |
| 3 | Quản lý ca làm việc | SM-01 → SM-04 | Medium |
| 4 | Thông báo email/SMS | NM-01, NM-02 | Medium |

### Sprint 4 (Tuần 7–8): Analytics

| # | Tính năng | Use Case | Priority |
|---|-----------|----------|---------|
| 1 | Báo cáo doanh thu, lượng khách, menu | RA-01 → RA-03 | Medium |
| 2 | Quản lý khuyến mãi | PM-10 | Medium |
| 3 | Xuất PDF/Excel | MM-04, UM-04 | Low |

### Backlog (v2.0)
- Mobile app (React Native) cho cashier
- Kitchen Display System (KDS)
- Hệ thống đánh giá từ khách
- Loyalty program / tích điểm

---

## 19. License

```
MIT License — Copyright (c) 2025 RMS Team
```

---

<div align="center">

**RMS — Restaurant Management System**

Spring Boot 3.2 · React 18 · SQL Server 2019 · Java 17

</div>
>>>>>>> origin/main
