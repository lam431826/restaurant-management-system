package com.rms.restaurant.common.init;

import com.rms.restaurant.common.utils.enums.CookingStatus;
import com.rms.restaurant.common.utils.enums.OrderStatus;
import com.rms.restaurant.common.utils.enums.TableStatus;
import com.rms.restaurant.common.utils.enums.UserRole;
import com.rms.restaurant.common.utils.enums.UserStatus;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.menu.model.MenuCategory;
import com.rms.restaurant.module.menu.model.MenuItem;
import com.rms.restaurant.module.menu.repository.MenuCategoryRepository;
import com.rms.restaurant.module.menu.repository.MenuItemRepository;
import com.rms.restaurant.module.order.model.Order;
import com.rms.restaurant.module.order.model.OrderItem;
import com.rms.restaurant.module.order.repository.OrderRepository;
import com.rms.restaurant.module.payment.model.Promotion;
import com.rms.restaurant.module.payment.repository.PromotionRepository;
import com.rms.restaurant.module.table.model.RestaurantTable;
import com.rms.restaurant.module.table.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TableRepository tableRepository;
    private final MenuCategoryRepository menuCategoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final PromotionRepository promotionRepository;
    private final OrderRepository orderRepository;

    record SeedUser(String username, String fullName, String email, String phone,
                    UserRole role, UserStatus status, String rawPassword) {}

    private static final List<SeedUser> SEED_USERS = List.of(
        new SeedUser("admin",      "System Administrator", "admin@rms.local",      "0900000001", UserRole.ADMIN,    UserStatus.ACTIVE,    "Admin@123456"),
        new SeedUser("manager01",  "Manager One",          "manager01@rms.local",  "0900000002", UserRole.MANAGER,  UserStatus.ACTIVE, "Manager@123456"),
        new SeedUser("cashier01",  "Cashier One",          "cashier01@rms.local",  "0900000003", UserRole.CASHIER,  UserStatus.ACTIVE, "Cashier@123456"),
        new SeedUser("waiter01",   "Waiter One",           "waiter01@rms.local",   "0900000004", UserRole.WAITER,   UserStatus.ACTIVE, "Waiter@123456")
    );

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedUsers();
        seedTables();
        seedMenu();
        seedPromotions();
        //seedOrders();
    }

    private void seedUsers() {
        int created = 0;
        for (SeedUser seed : SEED_USERS) {
            if (userRepository.existsByUsername(seed.username())) continue;
            userRepository.save(User.builder()
                    .username(seed.username()).fullName(seed.fullName()).email(seed.email()).phone(seed.phone())
                    .role(seed.role()).status(seed.status()).passwordHash(passwordEncoder.encode(seed.rawPassword()))
                    .build());
            created++;
        }
        if (created > 0) log.info("DataSeeder: created {} user(s)", created);
    }

    /*
     * Wasabi Restaurant — bố trí mặt bằng:
     *
     *  Tầng 1 (12 bàn) — khu vực ăn chính, cạnh cửa sổ & trung tâm
     *    T1-01..T1-04 : 2 người  (bàn đôi — góc cửa sổ)
     *    T1-05..T1-09 : 4 người  (bàn gia đình nhỏ — khu trung tâm)
     *    T1-10..T1-12 : 6 người  (bàn nhóm — phía trong cung)
     *
     *  Tầng 2 (10 bàn) — khu vực yên tĩnh hơn
     *    T2-01..T2-04 : 4 người
     *    T2-05..T2-08 : 6 người
     *    T2-09..T2-10 : 8 người  (bàn tròn lớn)
     *
     *  Phòng VIP (4 phòng riêng)
     *    VIP-01       : 8  người
     *    VIP-02       : 10 người
     *    VIP-03       : 12 người
     *    VIP-04       : 20 người (phòng họp / tiệc)
     *
     *  Tổng: 26 bàn
     */
    private void seedTables() {
        if (tableRepository.count() > 0) {
            logTableList();
            return;
        }

        tableRepository.saveAll(List.of(
            // ── Tầng 1 ── bàn đôi (cạnh cửa sổ)
            tbl("T1-01", 2, "Tầng 1", "QR-T1-01"),
            tbl("T1-02", 2, "Tầng 1", "QR-T1-02"),
            tbl("T1-03", 2, "Tầng 1", "QR-T1-03"),
            tbl("T1-04", 2, "Tầng 1", "QR-T1-04"),
            // ── Tầng 1 ── bàn 4 người (khu trung tâm)
            tbl("T1-05", 4, "Tầng 1", "QR-T1-05"),
            tbl("T1-06", 4, "Tầng 1", "QR-T1-06"),
            tbl("T1-07", 4, "Tầng 1", "QR-T1-07"),
            tbl("T1-08", 4, "Tầng 1", "QR-T1-08"),
            tbl("T1-09", 4, "Tầng 1", "QR-T1-09"),
            // ── Tầng 1 ── bàn 6 người (phía trong)
            tbl("T1-10", 6, "Tầng 1", "QR-T1-10"),
            tbl("T1-11", 6, "Tầng 1", "QR-T1-11"),
            tbl("T1-12", 6, "Tầng 1", "QR-T1-12"),

            // ── Tầng 2 ── bàn 4 người
            tbl("T2-01", 4, "Tầng 2", "QR-T2-01"),
            tbl("T2-02", 4, "Tầng 2", "QR-T2-02"),
            tbl("T2-03", 4, "Tầng 2", "QR-T2-03"),
            tbl("T2-04", 4, "Tầng 2", "QR-T2-04"),
            // ── Tầng 2 ── bàn 6 người
            tbl("T2-05", 6, "Tầng 2", "QR-T2-05"),
            tbl("T2-06", 6, "Tầng 2", "QR-T2-06"),
            tbl("T2-07", 6, "Tầng 2", "QR-T2-07"),
            tbl("T2-08", 6, "Tầng 2", "QR-T2-08"),
            // ── Tầng 2 ── bàn tròn lớn
            tbl("T2-09", 8, "Tầng 2", "QR-T2-09"),
            tbl("T2-10", 8, "Tầng 2", "QR-T2-10"),

            // ── Phòng VIP ──
            tbl("VIP-01",  8, "Phòng VIP", "QR-VIP-01"),
            tbl("VIP-02", 10, "Phòng VIP", "QR-VIP-02"),
            tbl("VIP-03", 12, "Phòng VIP", "QR-VIP-03"),
            tbl("VIP-04", 20, "Phòng VIP", "QR-VIP-04")
        ));
        log.info("DataSeeder: seeded 26 restaurant tables (Tầng 1 / Tầng 2 / VIP)");
        logTableList();
    }

    private RestaurantTable tbl(String name, int capacity, String area, String qrToken) {
        RestaurantTable t = new RestaurantTable();
        t.setName(name);
        t.setCapacity(capacity);
        t.setArea(area);
        t.setStatus(TableStatus.AVAILABLE);
        t.setQrToken(qrToken);
        return t;
    }

    private void logTableList() {
        log.info("============== DANH SÁCH BÀN (TABLE ID & QR TOKEN) ==============");
        tableRepository.findAllByOrderByAreaAscNameAsc().forEach(t ->
            log.info("  [{}] id={} | qr={}", t.getName(), t.getId(), t.getQrToken())
        );
        log.info("==================================================================");
    }

    private void seedMenu() {
        if (menuCategoryRepository.count() > 0) return;

        MenuCategory cat1 = createCat("Khai vị", 1, "fas fa-seedling");
        MenuCategory cat2 = createCat("Món chính", 2, "fas fa-utensils");
        MenuCategory cat3 = createCat("Đồ uống", 3, "fas fa-glass-martini-alt");
        MenuCategory cat4 = createCat("Tráng miệng", 4, "fas fa-ice-cream");
        List<MenuCategory> savedCats = menuCategoryRepository.saveAll(List.of(cat1, cat2, cat3, cat4));
        
        cat1 = savedCats.get(0);
        cat2 = savedCats.get(1);
        cat3 = savedCats.get(2);
        cat4 = savedCats.get(3);

        menuItemRepository.saveAll(List.of(
            createItem(cat1.getId(), "Salad Cá Hồi", 120000, "Salad tươi ngon với cá hồi Na Uy.", "https://example.com/salad.jpg", true),
            createItem(cat1.getId(), "Súp Cua Măng Tây", 85000, "Súp cua biển nấu với măng tây tươi.", "https://example.com/sup.jpg", true),
            
            createItem(cat2.getId(), "Bò Bít Tết Úc", 350000, "Thịt bò Úc nướng kèm khoai tây chiên.", "https://example.com/beef.jpg", true),
            createItem(cat2.getId(), "Cá Chẽm Sốt Cam", 220000, "Phi lê cá chẽm chiên giòn rưới sốt cam.", "https://example.com/ca.jpg", true),
            createItem(cat2.getId(), "Gà Nướng Mật Ong", 190000, "Đùi gà góc tư nướng mật ong.", "https://example.com/ga.jpg", false),
            createItem(cat2.getId(), "Pizza Hải Sản", 250000, "Pizza đế mỏng, topping mực, tôm.", "https://example.com/pizza.jpg", true),
            
            createItem(cat3.getId(), "Coca Cola", 25000, "Lon 330ml ướp lạnh.", "https://example.com/coca.jpg", true),
            createItem(cat3.getId(), "Nước Cam Ép", 45000, "Cam vắt tươi không đường nguyên chất.", "https://example.com/cam.jpg", true),
            
            createItem(cat4.getId(), "Bánh Flan Caramen", 35000, "Bánh flan mềm mịn thơm mùi trứng sữa.", "https://example.com/flan.jpg", true),
            createItem(cat4.getId(), "Dĩa Trái Cây Thập Cẩm", 90000, "Dưa hấu, xoài, thanh long, nho Mỹ.", "https://example.com/trai.jpg", true)
        ));
        log.info("DataSeeder: created menu categories and items");
    }

    private MenuCategory createCat(String name, int order, String icon) {
        MenuCategory c = new MenuCategory();
        c.setName(name); c.setDisplayOrder(order); c.setIcon(icon);
        return c;
    }

    private MenuItem createItem(String catId, String name, int price, String desc, String img, boolean available) {
        MenuItem i = new MenuItem();
        i.setCategoryId(catId); i.setName(name); i.setPrice(BigDecimal.valueOf(price));
        i.setDescription(desc); i.setImageUrl(img); i.setAvailable(available);
        return i;
    }

    private void seedPromotions() {
        if (promotionRepository.count() > 0) return;

        promotionRepository.saveAll(List.of(
            // 10% off — always-on, used in Postman "Create Invoice with Promotion Code"
            Promotion.builder()
                .code("PERCENT10")
                .description("Giảm 10% tổng hóa đơn")
                .discountPercent(new BigDecimal("10.00"))
                .validFrom(LocalDate.of(2026, 1, 1))
                .validTo(LocalDate.of(2026, 12, 31))
                .active(true)
                .build(),

            // Fixed 50 000 VND off — always-on
            Promotion.builder()
                .code("FLAT50K")
                .description("Giảm 50.000đ cho mọi đơn hàng")
                .discountAmount(new BigDecimal("50000"))
                .validFrom(LocalDate.of(2026, 1, 1))
                .validTo(LocalDate.of(2026, 12, 31))
                .active(true)
                .build(),

            // 20% off — inactive (for deactivated-promotion test cases)
            Promotion.builder()
                .code("WELCOME20")
                .description("Khuyến mãi chào mừng khách hàng mới - Giảm 20%")
                .discountPercent(new BigDecimal("20.00"))
                .validFrom(LocalDate.of(2026, 6, 1))
                .validTo(LocalDate.of(2026, 6, 30))
                .active(false)
                .build(),

            // 30% off — expired date range, inactive (for expired-promotion test cases)
            Promotion.builder()
                .code("SUMMER30")
                .description("Khuyến mãi hè 2025 - Giảm 30%")
                .discountPercent(new BigDecimal("30.00"))
                .validFrom(LocalDate.of(2025, 6, 1))
                .validTo(LocalDate.of(2025, 8, 31))
                .active(false)
                .build()
        ));
        log.info("DataSeeder: created 4 promotion(s)");
    }

    private void seedOrders() {
        if (orderRepository.count() > 0) return;

        List<RestaurantTable> tables = tableRepository.findAll();
        List<MenuItem> menuItems = menuItemRepository.findAll();
        if (tables.isEmpty() || menuItems.isEmpty()) return;

        String cashierId = userRepository.findByUsername("cashier01").map(User::getId).orElse(null);

        RestaurantTable table1 = findTableByName(tables, "Bàn 01");
        RestaurantTable table2 = findTableByName(tables, "Bàn 02");
        RestaurantTable table3 = findTableByName(tables, "Bàn 03");
        RestaurantTable table4 = findTableByName(tables, "Bàn 04");
        RestaurantTable table5 = findTableByName(tables, "Bàn 05");
        if (table1 == null || table2 == null || table3 == null || table4 == null || table5 == null) return;

        Order order1 = Order.builder()
                .tableId(table1.getId())
                .status(OrderStatus.PENDING)
                .note("Khách yêu cầu không hành")
                .build();
        addOrderItem(order1, menuItems, "Salad Cá Hồi", 2, CookingStatus.PENDING);
        addOrderItem(order1, menuItems, "Coca Cola", 2, CookingStatus.PENDING);

        Order order2 = Order.builder()
                .tableId(table2.getId())
                .cashierId(cashierId)
                .status(OrderStatus.ACCEPTED)
                .build();
        addOrderItem(order2, menuItems, "Súp Cua Măng Tây", 1, CookingStatus.PENDING);
        addOrderItem(order2, menuItems, "Nước Cam Ép", 2, CookingStatus.PENDING);

        Order order3 = Order.builder()
                .tableId(table3.getId())
                .cashierId(cashierId)
                .status(OrderStatus.PREPARING)
                .build();
        addOrderItem(order3, menuItems, "Bò Bít Tết Úc", 1, CookingStatus.COOKING);
        addOrderItem(order3, menuItems, "Cá Chẽm Sốt Cam", 1, CookingStatus.COOKING);

        Order order4 = Order.builder()
                .tableId(table4.getId())
                .cashierId(cashierId)
                .status(OrderStatus.SERVED)
                .build();
        addOrderItem(order4, menuItems, "Gà Nướng Mật Ong", 2, CookingStatus.SERVED);
        addOrderItem(order4, menuItems, "Pizza Hải Sản", 1, CookingStatus.SERVED);

        Order order5 = Order.builder()
                .tableId(table5.getId())
                .cashierId(cashierId)
                .status(OrderStatus.CLOSED)
                .build();
        addOrderItem(order5, menuItems, "Bánh Flan Caramen", 2, CookingStatus.SERVED);
        addOrderItem(order5, menuItems, "Dĩa Trái Cây Thập Cẩm", 1, CookingStatus.SERVED);

        Order order6 = Order.builder()
                .tableId(table1.getId())
                .status(OrderStatus.CANCELLED)
                .note("Khách đổi ý hủy đơn")
                .build();
        addOrderItem(order6, menuItems, "Coca Cola", 1, CookingStatus.PENDING);

        orderRepository.saveAll(List.of(order1, order2, order3, order4, order5, order6));
        log.info("DataSeeder: created 6 order(s) covering all order statuses");
    }

    private RestaurantTable findTableByName(List<RestaurantTable> tables, String name) {
        return tables.stream().filter(t -> name.equals(t.getName())).findFirst().orElse(null);
    }

    private void addOrderItem(Order order, List<MenuItem> menuItems, String menuItemName, int quantity, CookingStatus cookingStatus) {
        MenuItem menuItem = menuItems.stream().filter(m -> menuItemName.equals(m.getName())).findFirst().orElse(null);
        if (menuItem == null) return;
        order.getItems().add(OrderItem.builder()
                .order(order)
                .menuItemId(menuItem.getId())
                .menuItemName(menuItem.getName())
                .quantity(quantity)
                .unitPrice(menuItem.getPrice())
                .cookingStatus(cookingStatus)
                .build());
    }
}
