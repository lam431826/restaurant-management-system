# Hướng Dẫn: Package `common` — Cơ Sở Hạ Tầng Dùng Chung

Package `com.rms.restaurant.common` chứa toàn bộ hạ tầng ngang (cross-cutting infrastructure) của ứng dụng — những thành phần **không thuộc về nghiệp vụ cụ thể nào** nhưng được tất cả các module nghiệp vụ sử dụng.

```
common/
├── datasource/     # Kết nối database & HTTP client ra ngoài
├── filter/         # Servlet filter: xác thực JWT, ghi log request
├── security/       # Dịch vụ JWT (tạo & kiểm tra token)
└── utils/
    ├── enums/      # Enum trạng thái dùng chung toàn hệ thống
    ├── exception/  # Phân cấp exception + handler tập trung
    └── wrapper/    # Chuẩn hoá cấu trúc response
```

---

## 1. `datasource/` — Cấu Hình Database & HTTP Client

### 1.1 `DataSourceProperties`

**File**: [DataSourceProperties.java](../src/main/java/com/rms/restaurant/common/datasource/DataSourceProperties.java)

```java
@ConfigurationProperties(prefix = "spring.datasource")
public class DataSourceProperties {
    private String url;
    private String username;
    private String password;
    private String driverClassName;
}
```

**Chức năng**: Ánh xạ 4 thuộc tính `spring.datasource.*` trong `application.properties` vào một Java object — tách biệt việc đọc config khỏi việc sử dụng config.

**Khi nào dùng**: Được inject tự động vào `DataSourceConfig`. Bạn không gọi class này trực tiếp; chỉ chỉnh `application.properties` hoặc `.env` để thay đổi kết nối DB.

---

### 1.2 `DataSourceConfig`

**File**: [DataSourceConfig.java](../src/main/java/com/rms/restaurant/common/datasource/DataSourceConfig.java)

```java
@Bean @Primary
public DataSource dataSource() {
    HikariDataSource ds = new HikariDataSource();
    ds.setMaximumPoolSize(10);
    ds.setMinimumIdle(2);
    ds.setConnectionTimeout(30_000);   // 30 giây
    ds.setIdleTimeout(600_000);        // 10 phút
    ds.setMaxLifetime(1_800_000);      // 30 phút
    ...
}
```

**Chức năng**: Tạo **HikariCP connection pool** — pool kết nối JDBC tới SQL Server. HikariCP giữ sẵn tối thiểu 2 kết nối, tối đa 10 kết nối đồng thời.

**Thông số quan trọng**:
| Tham số | Giá trị | Ý nghĩa |
|---------|---------|---------|
| `maximumPoolSize` | 10 | Tối đa 10 thread DB đồng thời |
| `minimumIdle` | 2 | Giữ sẵn 2 kết nối khi hệ thống rảnh |
| `connectionTimeout` | 30s | Thời gian chờ tối đa để lấy kết nối từ pool |
| `idleTimeout` | 10 phút | Đóng kết nối nhàn rỗi sau 10 phút |
| `maxLifetime` | 30 phút | Buộc tái tạo kết nối sau 30 phút (tránh kết nối chết) |

**Khi nào điều chỉnh**: Khi ứng dụng có nhiều request đồng thời và gặp lỗi "Unable to acquire JDBC Connection", tăng `maximumPoolSize`. Khi SQL Server bị quá tải, giảm xuống.

---

### 1.3 `PlatformDbConfig`

**File**: [PlatformDbConfig.java](../src/main/java/com/rms/restaurant/common/datasource/PlatformDbConfig.java)

```java
@Configuration
@EnableTransactionManagement
@EnableJpaAuditing
@EnableJpaRepositories(basePackages = "com.rms.restaurant.module")
public class PlatformDbConfig { }
```

**Chức năng**: Bật ba tính năng Spring Data JPA:

| Annotation | Tác dụng |
|---|---|
| `@EnableTransactionManagement` | Cho phép dùng `@Transactional` trong service |
| `@EnableJpaAuditing` | Tự động điền `@CreatedDate` / `@LastModifiedDate` trên entity |
| `@EnableJpaRepositories(...)` | Quét tất cả `JpaRepository` trong package `module` |

**Khi nào liên quan**:
- Khi thêm một `Repository` interface mới trong bất kỳ module nào → nó tự được phát hiện.
- Khi muốn thêm `createdAt`/`updatedAt` vào entity → annotate field với `@CreatedDate` + `@LastModifiedDate` và dùng `@EntityListeners(AuditingEntityListener.class)` trên class entity.

---

### 1.4 `RestTemplateConfig`

**File**: [RestTemplateConfig.java](../src/main/java/com/rms/restaurant/common/datasource/RestTemplateConfig.java)

```java
@Bean
public RestTemplate restTemplate(RestTemplateBuilder builder) {
    return builder
        .setConnectTimeout(Duration.ofSeconds(5))
        .setReadTimeout(Duration.ofSeconds(10))
        .build();
}
```

**Chức năng**: Tạo một `RestTemplate` bean dùng chung để gọi HTTP ra dịch vụ bên ngoài (VNPay, SendGrid, Twilio). Đặt timeout cứng: 5 giây kết nối, 10 giây đọc dữ liệu.

**Khi nào dùng**: Inject `RestTemplate` vào bất kỳ service nào cần gọi API bên ngoài.

```java
// Ví dụ trong integration module
@RequiredArgsConstructor
public class VnPayClient {
    private final RestTemplate restTemplate;

    public PaymentResponse createPayment(PaymentRequest req) {
        return restTemplate.postForObject(VNPAY_URL, req, PaymentResponse.class);
    }
}
```

---

## 2. `filter/` — Servlet Filter

Filter chạy **trước** khi request đến Controller. Được đăng ký vào Spring Security filter chain.

### 2.1 `JwtAuthenticationFilter`

**File**: [JwtAuthenticationFilter.java](../src/main/java/com/rms/restaurant/common/filter/JwtAuthenticationFilter.java)

**Luồng xử lý**:
```
Request đến
    │
    ├─ Không có header "Authorization: Bearer ..."
    │       → bỏ qua, chuyển tiếp (endpoint public vẫn cho qua)
    │
    └─ Có Bearer token
            │
            ├─ extractUsername(token) → lấy username từ JWT
            │
            ├─ loadUserByUsername(username) → lấy UserDetails từ DB
            │
            ├─ isTokenValid(token, userDetails)
            │       ├─ Hợp lệ → set Authentication vào SecurityContext
            │       └─ Không hợp lệ → không set (request sẽ bị reject bởi Security)
            │
            └─ chuyển tiếp filter chain
```

**Khi nào được gọi**: Mỗi HTTP request đều đi qua filter này một lần (kế thừa `OncePerRequestFilter`).

**Lưu ý quan trọng**:
- Filter này **không throw exception** — nó chỉ có hoặc không đặt authentication vào `SecurityContext`.
- Việc từ chối request xảy ra ở lớp `SecurityConfig` (quy tắc `authorizeHttpRequests`), không phải ở đây.
- Guest ordering dùng **table token** (header `X-Table-Token`), không qua filter này — được xử lý riêng trong module `guest_ordering`.

---

### 2.2 `HttpRequestLoggingFilter`

**File**: [HttpRequestLoggingFilter.java](../src/main/java/com/rms/restaurant/common/filter/HttpRequestLoggingFilter.java)

```java
log.info("{} {} → {} ({}ms)",
    request.getMethod(),
    request.getRequestURI(),
    response.getStatus(),
    latency);
```

**Chức năng**: Ghi log mỗi HTTP request theo format:
```
POST /api/auth/login → 200 (45ms)
GET  /api/orders/123 → 404 (12ms)
```

**Khi nào hữu ích**: Debug performance (ms), kiểm tra status code trả về, theo dõi traffic. Log ở level `INFO` — xem trong console hoặc file log.

---

## 3. `security/JwtService`

**File**: [JwtService.java](../src/main/java/com/rms/restaurant/common/security/JwtService.java)

**Chức năng**: Toàn bộ logic liên quan đến JWT — tạo token, đọc claim, kiểm tra hợp lệ.

### Các method chính

| Method | Dùng khi nào |
|--------|-------------|
| `generateAccessToken(userDetails, extraClaims)` | Sau khi login thành công → tạo access token 8 giờ |
| `generateRefreshToken(userDetails)` | Cùng lúc với access token → tạo refresh token 7 ngày |
| `extractUsername(token)` | Trong `JwtAuthenticationFilter` → biết token của ai |
| `isTokenValid(token, userDetails)` | Kiểm tra token đúng chủ + chưa hết hạn |
| `extractClaim(token, resolver)` | Đọc bất kỳ claim nào từ token (role, custom data) |

### Cấu hình (application.properties)

```properties
app.jwt.secret=<min-256-bit-key>          # HMAC-SHA256 signing key
app.jwt.access-token-expiration=28800000  # 8 giờ (ms)
app.jwt.refresh-token-expiration=604800000 # 7 ngày (ms)
```

### Ví dụ dùng trong AuthService

```java
@RequiredArgsConstructor
public class AuthService {
    private final JwtService jwtService;

    public LoginResponse login(LoginRequest req) {
        // ... xác thực password ...
        String accessToken  = jwtService.generateAccessToken(userDetails, Map.of("role", user.getRole()));
        String refreshToken = jwtService.generateRefreshToken(userDetails);
        return new LoginResponse(accessToken, refreshToken, ...);
    }
}
```

---

## 4. `utils/exception/` — Xử Lý Lỗi Tập Trung

### 4.1 Kiến trúc tổng thể

```
ApplicationError (enum)          ← định nghĩa tất cả loại lỗi + HTTP status
        │
ApplicationException (base)      ← mang ApplicationError + message
        │
        ├── ResourceNotFoundException   → 404 Not Found
        ├── UnauthorizedException       → 401 Unauthorized
        ├── ForbiddenException          → 403 Forbidden
        ├── ConflictException           → 409 Conflict
        └── RateLimitException          → 429 Too Many Requests

GlobalExceptionHandler (@RestControllerAdvice)  ← bắt tất cả, trả ErrorResponse
```

---

### 4.2 `ApplicationError` — Catalog Lỗi

**File**: [ApplicationError.java](../src/main/java/com/rms/restaurant/common/utils/exception/ApplicationError.java)

Enum này là **nguồn sự thật duy nhất** cho tất cả lỗi của ứng dụng. Mỗi giá trị gắn sẵn một thông điệp mặc định và HTTP status code.

```java
// Authentication
INVALID_CREDENTIALS("Invalid username or password", HttpStatus.UNAUTHORIZED),
OTP_MAX_ATTEMPTS("Exceeded maximum OTP attempts", HttpStatus.TOO_MANY_REQUESTS),
VERIFY_TOKEN_EXPIRED("Verification token has expired", HttpStatus.GONE),

// Resources
USER_NOT_FOUND("User not found", HttpStatus.NOT_FOUND),
ORDER_NOT_FOUND("Order not found", HttpStatus.NOT_FOUND),

// Business Rules
TABLE_NOT_AVAILABLE("Table is not available for this time slot", HttpStatus.CONFLICT),
INVALID_STATUS_TRANSITION("Invalid status transition", HttpStatus.UNPROCESSABLE_ENTITY),
```

**Nhóm lỗi**:
| Nhóm | Loại |
|------|------|
| Authentication | `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `INVALID_OTP`, `OTP_EXPIRED`, `RESEND_LIMIT_EXCEEDED`, `VERIFY_TOKEN_EXPIRED`, `INVALID_VERIFY_TOKEN`, ... |
| Resources | `USER_NOT_FOUND`, `TABLE_NOT_FOUND`, `ORDER_NOT_FOUND`, `RESERVATION_NOT_FOUND`, `INVOICE_NOT_FOUND`, `MENU_ITEM_NOT_FOUND`, `SHIFT_NOT_FOUND`, `PROMOTION_NOT_FOUND` |
| Business Rules | `TABLE_NOT_AVAILABLE`, `SHIFT_ALREADY_OPEN`, `CANNOT_CANCEL_PAID_ORDER`, `INVALID_STATUS_TRANSITION`, ... |
| System | `INTERNAL_ERROR` |

---

### 4.3 Subclass Exception — Throw Đúng Loại

**Quy tắc**: Luôn throw subclass phù hợp với ngữ nghĩa, không throw `ApplicationException` trực tiếp.

```java
// ✅ Đúng — dùng subclass phù hợp
throw new ResourceNotFoundException(ApplicationError.USER_NOT_FOUND);
throw new ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND, "Order #" + id + " not found");

throw new UnauthorizedException(ApplicationError.INVALID_CREDENTIALS);
throw new UnauthorizedException(ApplicationError.INVALID_VERIFY_TOKEN);

throw new ForbiddenException(ApplicationError.FORBIDDEN);
throw new ForbiddenException(ApplicationError.ACCOUNT_LOCKED);

throw new ConflictException(ApplicationError.TABLE_NOT_AVAILABLE);
throw new ConflictException(ApplicationError.SHIFT_ALREADY_OPEN);

throw new RateLimitException(ApplicationError.OTP_MAX_ATTEMPTS);
throw new RateLimitException(ApplicationError.RESEND_LIMIT_EXCEEDED);
```

**Constructor có 2 dạng**:
- `(ApplicationError error)` — dùng message mặc định từ enum
- `(ApplicationError error, String message)` — ghi đè message (thêm context như ID cụ thể)

---

### 4.4 `GlobalExceptionHandler`

**File**: [GlobalExceptionHandler.java](../src/main/java/com/rms/restaurant/common/utils/exception/GlobalExceptionHandler.java)

Bắt exception ở mọi controller và trả về `ErrorResponse` chuẩn.

**4 handler được đăng ký**:

| Handler | Bắt loại exception nào | HTTP Status |
|---------|------------------------|-------------|
| `handleApplication` | `ApplicationException` (và mọi subclass) | Theo `ApplicationError` |
| `handleValidation` | `MethodArgumentNotValidException` (vi phạm `@Valid`) | 400 |
| `handleAccessDenied` | `AccessDeniedException` (Spring Security) | 403 |
| `handleSystem` | `Exception` (bất kỳ lỗi không lường trước) | 500 |

**Cấu trúc `ErrorResponse` trả về**:

```json
// Lỗi thông thường (ApplicationException)
{
  "error": "USER_NOT_FOUND",
  "message": "User #42 not found",
  "path": "/api/users/42",
  "timestamp": "2026-06-08T08:00:00Z"
}

// Lỗi validation (@Valid)
{
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "path": "/api/users",
  "timestamp": "2026-06-08T08:00:00Z",
  "fieldErrors": {
    "username": "must not be blank",
    "password": "size must be between 8 and 50"
  }
}
```

**Lưu ý**: `fieldErrors` chỉ có trong validation error; các lỗi khác trả `null` (bị ẩn bởi `@JsonInclude(NON_NULL)` ở `ApiResponse`).

---

## 5. `utils/wrapper/` — Chuẩn Hoá Response

### 5.1 `ApiResponse<T>`

**File**: [ApiResponse.java](../src/main/java/com/rms/restaurant/common/utils/wrapper/ApiResponse.java)

Bọc mọi response thành công vào một cấu trúc nhất quán.

**3 factory method**:

```java
// Trả dữ liệu, không kèm message
ApiResponse.success(userDto)
// → { "data": {...}, "timestamp": "..." }

// Trả dữ liệu + message giải thích
ApiResponse.success(createdOrder, "Order created successfully")
// → { "data": {...}, "message": "Order created successfully", "timestamp": "..." }

// Không có data (chỉ confirm action)
ApiResponse.ok("Password changed successfully")
// → { "message": "Password changed successfully", "timestamp": "..." }
```

**Dùng trong Controller**:
```java
@GetMapping("/{id}")
public ResponseEntity<ApiResponse<UserDto>> getUser(@PathVariable Long id) {
    UserDto user = userService.findById(id);
    return ResponseEntity.ok(ApiResponse.success(user));
}

@DeleteMapping("/{id}")
public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
    userService.delete(id);
    return ResponseEntity.ok(ApiResponse.ok("User deactivated"));
}
```

**`@JsonInclude(NON_NULL)`**: field `data` hoặc `message` nếu null sẽ không xuất hiện trong JSON — tránh trả về `"data": null` hay `"message": null`.

---

### 5.2 `PageResponse<T>`

**File**: [PageResponse.java](../src/main/java/com/rms/restaurant/common/utils/wrapper/PageResponse.java)

Bọc kết quả phân trang từ Spring Data `Page<T>`.

**Cách dùng**:
```java
@GetMapping
public ResponseEntity<PageResponse<UserDto>> listUsers(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit) {

    Pageable pageable = PageRequest.of(page - 1, limit); // Spring Data dùng 0-based
    Page<UserDto> result = userService.findAll(pageable);
    return ResponseEntity.ok(PageResponse.of(result));
}
```

**JSON trả về**:
```json
{
  "data": [ {...}, {...} ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 87,
    "totalPages": 5
  }
}
```

**Lưu ý**: `PageResponse.of(page)` tự động chuyển từ 0-based (Spring) sang 1-based (API). Frontend nhận `page: 1` thay vì `page: 0`.

---

## 6. `utils/enums/` — Enum Trạng Thái Dùng Chung

Tất cả enum được lưu dưới dạng `STRING` trong database (qua `@Enumerated(EnumType.STRING)` trên entity).

### Bảng Tổng Hợp

| Enum | Giá trị | Module dùng |
|------|---------|-------------|
| `UserRole` | `WAITER`, `CASHIER`, `MANAGER`, `ADMIN` | authentication, user |
| `UserStatus` | `UN_ACTIVE`, `ACTIVE`, `INACTIVE`, `LOCKED` | authentication, user |
| `OrderStatus` | `PENDING → ACCEPTED → PREPARING → SERVED → CLOSED \| CANCELLED` | order, guest_ordering |
| `TableStatus` | `AVAILABLE`, `OCCUPIED`, `RESERVED`, `CLEANING` | table |
| `ReservationStatus` | `PENDING → CONFIRMED → CHECKED_IN \| NO_SHOW \| CANCELLED` | reservation, online_reservation |
| `CookingStatus` | `PENDING → COOKING → READY → SERVED` | order (từng order item) |
| `PaymentMethod` | `CASH`, `CARD`, `QR`, `E_WALLET` | payment |
| `NotificationChannel` | `EMAIL`, `SMS` | notification |

### Luồng Trạng Thái

```
UserStatus:        UN_ACTIVE → ACTIVE → INACTIVE | LOCKED
OrderStatus:       PENDING → ACCEPTED → PREPARING → SERVED → CLOSED
                                                          ↘ CANCELLED
ReservationStatus: PENDING → CONFIRMED → CHECKED_IN
                                      ↘ NO_SHOW | CANCELLED
CookingStatus:     PENDING → COOKING → READY → SERVED
```

**Dùng trong `@PreAuthorize`**:
```java
// Kiểm tra role trong Security
@PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
public void updateMenu(...) { ... }
```

**Dùng trong Service để kiểm tra trạng thái hợp lệ**:
```java
if (order.getStatus() != OrderStatus.SERVED) {
    throw new ConflictException(ApplicationError.ORDER_NOT_CLOSEABLE);
}
```

---

## 7. Sơ Đồ Tương Tác Giữa Các Thành Phần

```
HTTP Request
     │
     ▼
HttpRequestLoggingFilter       ← ghi log start time
     │
     ▼
JwtAuthenticationFilter        ← đọc header, validate JWT, set SecurityContext
     │
     ▼
SecurityConfig (authorizeHttpRequests)  ← kiểm tra quyền truy cập endpoint
     │
     ▼
Controller
     │
     ├─→ Service  ─→  throw ResourceNotFoundException(ApplicationError.ORDER_NOT_FOUND)
     │                           ↓
     │               GlobalExceptionHandler.handleApplication()
     │                           ↓
     │               ErrorResponse { error: "ORDER_NOT_FOUND", ... }
     │
     └─→ Service  ─→  return data
                          ↓
                   ApiResponse.success(data)   hoặc   PageResponse.of(page)
                          ↓
                   ResponseEntity.ok(...)
     │
     ▼
HttpRequestLoggingFilter       ← ghi log end time + status code
     │
     ▼
HTTP Response
```
