# RMS Backend — Coding Convention

> **Dự án:** Restaurant Management System · Spring Boot 3.2 / Java 17  
> **Phiên bản:** 1.0 · 2026

---

## Mục lục

1. [Quy ước đặt tên](#1-quy-ước-đặt-tên)
2. [Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
3. [Layer Architecture](#3-layer-architecture)
4. [Model (Entity)](#4-model-entity)
5. [Repository](#5-repository)
6. [DTO (Data Transfer Object)](#6-dto-data-transfer-object)
7. [Mapper (MapStruct)](#7-mapper-mapstruct)
8. [Service](#8-service)
9. [Controller](#9-controller)
10. [Bảo mật & Phân quyền](#10-bảo-mật--phân-quyền)
11. [Database & Flyway Migration](#11-database--flyway-migration)
12. [Xử lý lỗi](#12-xử-lý-lỗi)
13. [Các quy tắc chung](#13-các-quy-tắc-chung)

---

## 1. Quy ước đặt tên

| Thành phần | Quy ước | Ví dụ |
|---|---|---|
| Package | `snake_case` | `guest_ordering`, `online_reservation` |
| Class | `PascalCase` | `MenuItemService`, `OrderController` |
| Method / biến | `camelCase` | `createMenuItem`, `orderId` |
| Hằng số | `SCREAMING_SNAKE_CASE` | `MAX_LOGIN_ATTEMPTS` |
| API endpoint | `kebab-case`, số nhiều | `/api/menu-items`, `/api/orders` |
| File migration | `V{n}__snake_case.sql` | `V3__create_menu.sql` |
| DTO Request | `XxxRequest` | `CreateMenuItemRequest` |
| DTO Response | `XxxResponse` | `MenuItemResponse` |
| Service interface | `XxxService` | `MenuService` |
| Service impl | `XxxServiceImpl` | `MenuServiceImpl` |

---

## 2. Cấu trúc thư mục

Dự án theo **Feature-Based Architecture** — mỗi module chứa đủ các layer bên trong.

```
backend/src/main/java/com/rms/restaurant/
├── RmsApplication.java
├── common/
│   ├── datasource/         ← Cấu hình DB, JPA, HikariCP
│   ├── filter/             ← JWT filter, logging filter
│   ├── security/           ← JwtService
│   └── utils/
│       ├── enums/          ← Enum dùng chung (UserRole, OrderStatus...)
│       ├── exception/      ← ApplicationException, GlobalExceptionHandler
│       └── wrapper/        ← ApiResponse, PageResponse
└── module/
    ├── authentication/
    ├── user/
    ├── menu/
    └── ...                 ← Các module nghiệp vụ khác
```

Cấu trúc bên trong mỗi module:

```
module/<ten_module>/
├── config/         ← Cấu hình riêng của module
├── controller/     ← REST Controller
├── dto/            ← Request / Response DTO
├── mapper/         ← MapStruct mapper
├── model/          ← JPA Entity
├── repository/     ← Spring Data JPA Repository
└── service/
    ├── XxxService.java          ← Interface
    └── impl/
        └── XxxServiceImpl.java  ← Implementation
```

---

## 3. Layer Architecture

Request đi qua các layer theo thứ tự:

```
Client → [Filter] JwtAuthenticationFilter → [Controller] → [Service] → [Repository] → Database
```

Trách nhiệm từng layer — **không được vi phạm ranh giới**:

| Layer | Trách nhiệm | KHÔNG làm |
|---|---|---|
| Controller | Nhận request, validate input, gọi Service, trả response | Viết logic nghiệp vụ |
| Service | Chứa toàn bộ business logic | Gọi trực tiếp DB |
| Repository | Truy vấn DB qua JPA/JPQL | Chứa logic nghiệp vụ |
| Model | Ánh xạ bảng DB | Gọi Service/Repository |
| DTO | Chứa dữ liệu vào/ra API | Tham chiếu Entity trực tiếp |

---

## 4. Model (Entity)

```java
@Entity
@Table(name = "menu_items")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MenuItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private MenuCategory category;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private BigDecimal price;

    @Builder.Default
    private boolean available = true;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
```

**Quy tắc:**

- Dùng `@Builder.Default` khi field có giá trị mặc định. Nếu không, Lombok `@Builder` sẽ bỏ qua giá trị đó.
- Tên bảng dùng `snake_case`, số nhiều (ví dụ: `menu_items`, `order_items`).
- Luôn dùng `FetchType.LAZY` cho quan hệ `@ManyToOne` và `@OneToMany` để tránh N+1 query.
- ID dùng `UUID` string, không dùng auto-increment integer.
- Luôn có `createdAt` và `updatedAt` với `@CreatedDate` / `@LastModifiedDate`.

---

## 5. Repository

```java
@Repository
public interface MenuItemRepository extends JpaRepository<MenuItem, String> {

    // Spring Data tự sinh query từ tên method
    List<MenuItem> findByCategoryIdAndAvailableTrue(String categoryId);

    // Custom query bằng JPQL
    @Query("SELECT m FROM MenuItem m WHERE m.name LIKE %:keyword%")
    List<MenuItem> searchByName(@Param("keyword") String keyword);

    // Query sửa dữ liệu cần @Modifying
    @Modifying
    @Query("UPDATE MenuItem m SET m.available = :status WHERE m.id = :id")
    void updateAvailability(@Param("id") String id, @Param("status") boolean status);
}
```

**Quy tắc:**

- Ưu tiên **Spring Data method naming** cho query đơn giản.
- Dùng **JPQL** (không dùng native SQL) trừ khi thực sự cần thiết.
- Query sửa/xóa dữ liệu phải có `@Modifying`.
- Không đặt logic nghiệp vụ trong Repository.
- Không inject Repository trực tiếp vào Controller.

---

## 6. DTO (Data Transfer Object)

Dùng **Java record** cho tất cả DTO.

```java
// Request DTO — bắt buộc có validation annotation
public record CreateMenuItemRequest(
        @NotBlank String categoryId,
        @NotBlank @Size(max = 255) String name,
        String description,
        @NotNull @DecimalMin("0.0") BigDecimal price
) {}

// Response DTO — không cần validation
public record MenuItemResponse(
        String id,
        String categoryName,
        String name,
        String description,
        BigDecimal price,
        boolean available
) {}
```

**Quy tắc:**

- Request DTO: dùng `@NotBlank`, `@NotNull`, `@Size`, `@DecimalMin`... để validate. Controller dùng `@Valid` để kích hoạt.
- Response DTO: không cần validation annotation.
- DTO **không được** tham chiếu trực tiếp đến Entity.
- Đặt trong package `dto/` của module tương ứng.

---

## 7. Mapper (MapStruct)

```java
@Mapper(componentModel = "spring")
public interface MenuMapper {

    // Map field cùng tên — tự động
    MenuItemResponse toResponse(MenuItem item);

    // Map field khác tên dùng @Mapping
    @Mapping(source = "category.name", target = "categoryName")
    MenuItemResponse toResponseWithCategory(MenuItem item);

    // Tạo Entity từ Request — bỏ qua các field do hệ thống quản lý
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    MenuItem toEntity(CreateMenuItemRequest request);

    List<MenuItemResponse> toResponseList(List<MenuItem> items);
}
```

**Quy tắc:**

- Luôn dùng `componentModel = "spring"` để inject qua Spring DI.
- Luôn `ignore` các field `id`, `createdAt`, `updatedAt` khi map từ Request sang Entity.
- Đặt trong package `mapper/` của module tương ứng.

---

## 8. Service

### Interface

```java
public interface MenuService {
    List<MenuItemResponse> getPublicMenu();
    MenuItemResponse getItemById(String id);
    MenuItemResponse createItem(CreateMenuItemRequest request);
    MenuItemResponse updateItem(String id, UpdateMenuItemRequest request);
    void deleteItem(String id);
}
```

### Implementation

```java
@Service
@RequiredArgsConstructor
@Transactional
public class MenuServiceImpl implements MenuService {

    private final MenuItemRepository menuItemRepository;
    private final MenuCategoryRepository menuCategoryRepository;
    private final MenuMapper menuMapper;

    @Override
    @Transactional(readOnly = true)
    public List<MenuItemResponse> getPublicMenu() {
        return menuItemRepository.findAll().stream()
                .filter(MenuItem::isAvailable)
                .map(menuMapper::toResponseWithCategory)
                .toList();
    }

    @Override
    public MenuItemResponse createItem(CreateMenuItemRequest request) {
        MenuCategory category = menuCategoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ApplicationException(ApplicationError.NOT_FOUND));
        MenuItem item = menuMapper.toEntity(request);
        item.setCategory(category);
        return menuMapper.toResponse(menuItemRepository.save(item));
    }
}
```

**Quy tắc:**

- `@Transactional` đặt ở **mức class** trên `ServiceImpl`. Chỉ đặt `@Transactional` ở Controller hay Repository khi thực sự cần.
- Method chỉ đọc dùng `@Transactional(readOnly = true)`.
- Mỗi method **không quá 30 dòng**. Nếu dài hơn, tách thành `private` method.
- Dùng `Optional.orElseThrow()` thay vì kiểm tra `null` thủ công.
- Ném `ApplicationException` với mã lỗi từ enum `ApplicationError` — không ném exception chung chung.
- Inject dependency qua **constructor** (`@RequiredArgsConstructor`) — không dùng `@Autowired` trên field.

---

## 9. Controller

```java
@RestController
@RequestMapping("/api/menu")
@RequiredArgsConstructor
public class MenuManagementController {

    private final MenuService menuService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MenuItemResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(menuService.getPublicMenu()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<MenuItemResponse>> create(
            @RequestBody @Valid CreateMenuItemRequest request) {
        return ResponseEntity.status(201)
                .body(ApiResponse.success(menuService.createItem(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<MenuItemResponse>> update(
            @PathVariable String id,
            @RequestBody @Valid UpdateMenuItemRequest request) {
        return ResponseEntity.ok(ApiResponse.success(menuService.updateItem(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        menuService.deleteItem(id);
        return ResponseEntity.noContent().build();
    }
}
```

**Quy tắc:**

- Controller **chỉ** nhận request, validate và gọi Service — không viết logic nghiệp vụ.
- Luôn dùng `@Valid` trên `@RequestBody` để kích hoạt validation.
- Wrap response trong `ApiResponse<T>`.
- HTTP status code: `200 OK` (GET/PUT), `201 Created` (POST), `204 No Content` (DELETE).
- Phân quyền dùng `@PreAuthorize` — không hardcode kiểm tra role trong body method.

---

## 10. Bảo mật & Phân quyền

### Roles

| Role | Quyền |
|---|---|
| `ADMIN` | Quản lý toàn hệ thống & user |
| `MANAGER` | Quản lý menu, báo cáo |
| `CASHIER` | Quản lý order & thanh toán |
| `WAITER` | Quản lý reservation & bàn |

### Phân quyền endpoint

```java
// Chỉ Manager và Admin
@PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")

// Chỉ Admin
@PreAuthorize("hasRole('ADMIN')")

// Tất cả user đã đăng nhập
@PreAuthorize("isAuthenticated()")
```

### Gọi API có bảo mật

```
Authorization: Bearer <accessToken>
```

**Quy tắc:**

- Access token hết hạn sau **8 giờ**. Dùng `POST /api/auth/refresh` để lấy token mới.
- Tài khoản bị khóa sau **5 lần đăng nhập sai**. Admin dùng `PATCH /api/users/{id}/unlock` để mở.
- Endpoint public (không cần token) phải được khai báo rõ ràng trong Security config.

---

## 11. Database & Flyway Migration

### Đặt tên file migration

```
V{số}__mô_tả.sql
```

- `V` viết hoa, hai dấu gạch dưới `__`, mô tả dùng `snake_case`, không dấu cách.
- Ví dụ: `V3__create_menu.sql`, `V8__add_column_discount.sql`

### Danh sách migration hiện tại

| File | Nội dung |
|---|---|
| `V1__create_users_auth.sql` | users, refresh_tokens, otp_records, audit_logs |
| `V2__create_tables_reservations.sql` | restaurant_tables, reservations |
| `V3__create_menu.sql` | menu_categories, menu_items |
| `V4__create_orders.sql` | orders, order_items, assistance_requests |
| `V5__create_payment_invoice.sql` | promotions, invoices, payments, webhook_logs |
| `V6__create_shift.sql` | shifts, shift_cash_movements |
| `V7__create_notification_log.sql` | notification_logs |

**Quy tắc:**

- **KHÔNG BAO GIỜ** sửa file `V*.sql` đã được chạy. Flyway sẽ báo lỗi checksum mismatch.
- Mọi thay đổi schema phải tạo file migration mới với số thứ tự tiếp theo.
- Tên bảng dùng `snake_case`, số nhiều.

---

## 12. Xử lý lỗi

### Ném exception đúng cách

```java
// Dùng ApplicationException với mã lỗi từ enum
menuCategoryRepository.findById(id)
    .orElseThrow(() -> new ApplicationException(ApplicationError.NOT_FOUND));

// Kiểm tra điều kiện nghiệp vụ
if (userRepository.existsByUsername(request.username())) {
    throw new ApplicationException(ApplicationError.USERNAME_ALREADY_EXISTS);
}
```

### Các lỗi thường gặp

| Lỗi | Nguyên nhân | Cách fix |
|---|---|---|
| `Flyway checksum mismatch` | Đã sửa file `V*.sql` sau khi chạy | Tạo file migration mới |
| `403 Forbidden` | Token thiếu hoặc sai role | Kiểm tra token & role trong `@PreAuthorize` |
| `LazyInitializationException` | Truy cập lazy relation ngoài transaction | Thêm `@Transactional` hoặc dùng `JOIN FETCH` |
| `@Builder.Default` warning | Dùng `= value` trong class có `@Builder` | Thêm `@Builder.Default` trước field |
| Bean không tìm thấy | Thiếu `@Service`, `@Repository`, `@Component` | Kiểm tra annotation trên class |
| N+1 query | Vòng lặp gọi repo nhiều lần | Dùng `JOIN FETCH` hoặc `@EntityGraph` |
| `400 Bad Request` không rõ lý do | Validation fail | Đọc response body — `GlobalExceptionHandler` trả chi tiết lỗi |

---

## 13. Các quy tắc chung

### Code style

- Mỗi method trong Service **không quá 30 dòng**. Nếu dài hơn, tách thành `private` method.
- Không để logic nghiệp vụ trong Controller.
- Không inject Repository trực tiếp vào Controller.
- Dùng `Optional.orElseThrow()` thay vì kiểm tra `null` thủ công.
- Đặt `@Transactional` ở mức Service, không đặt ở Controller hay Repository.

### Dependency Injection

```java
// ✅ Đúng — constructor injection qua @RequiredArgsConstructor
@Service
@RequiredArgsConstructor
public class MenuServiceImpl {
    private final MenuItemRepository menuItemRepository;
}

// ❌ Sai — field injection
@Service
public class MenuServiceImpl {
    @Autowired
    private MenuItemRepository menuItemRepository;
}
```

### Tránh N+1 Query

```java
// ❌ Sai — gọi DB trong vòng lặp
items.forEach(item -> item.getCategory().getName()); // N+1

// ✅ Đúng — dùng JOIN FETCH
@Query("SELECT m FROM MenuItem m JOIN FETCH m.category WHERE m.available = true")
List<MenuItem> findAllAvailableWithCategory();
```

### Environment variable

- **KHÔNG** commit file `.env` lên Git.
- Không hardcode credential, secret key, password trong source code.
- Mọi cấu hình nhạy cảm đặt trong `.env` và load qua `application.properties`.

---

*RMS Backend Coding Convention · v1.0 · 2026*
