package com.rms.restaurant.common.init;

import com.rms.restaurant.common.utils.enums.TableStatus;
import com.rms.restaurant.common.utils.enums.UserRole;
import com.rms.restaurant.common.utils.enums.UserStatus;
import com.rms.restaurant.module.authentication.model.User;
import com.rms.restaurant.module.authentication.repository.UserRepository;
import com.rms.restaurant.module.menu.model.MenuCategory;
import com.rms.restaurant.module.menu.model.MenuItem;
import com.rms.restaurant.module.menu.repository.MenuCategoryRepository;
import com.rms.restaurant.module.menu.repository.MenuItemRepository;
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

    record SeedUser(String username, String fullName, String email, String phone,
                    UserRole role, UserStatus status, String rawPassword) {}

    private static final List<SeedUser> SEED_USERS = List.of(
        new SeedUser("admin",      "System Administrator", "admin@rms.local",      "0900000001", UserRole.ADMIN,    UserStatus.ACTIVE,    "Admin@123456"),
        new SeedUser("manager01",  "Manager One",          "manager01@rms.local",  "0900000002", UserRole.MANAGER,  UserStatus.UN_ACTIVE, "Manager@123456"),
        new SeedUser("cashier01",  "Cashier One",          "cashier01@rms.local",  "0900000003", UserRole.CASHIER,  UserStatus.UN_ACTIVE, "Cashier@123456"),
        new SeedUser("waiter01",   "Waiter One",           "waiter01@rms.local",   "0900000004", UserRole.WAITER,   UserStatus.UN_ACTIVE, "Waiter@123456")
    );

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedUsers();
        seedTables();
        seedMenu();
        seedPromotions();
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

    private void seedTables() {
        if (tableRepository.count() == 0) {
            tableRepository.saveAll(List.of(
                createTable("Bàn 01", 4, "Tầng 1", TableStatus.AVAILABLE, "token-ban-01"),
                createTable("Bàn 02", 4, "Tầng 1", TableStatus.AVAILABLE, "token-ban-02"),
                createTable("Bàn 03", 2, "Tầng 1", TableStatus.AVAILABLE,  "token-ban-03"),
                createTable("Bàn 04", 6, "Tầng 2", TableStatus.AVAILABLE, "token-ban-04"),
                createTable("Bàn 05", 8, "VIP",    TableStatus.AVAILABLE, "token-ban-05")
            ));
        }
        
        log.info("================= DANH SÁCH TABLE ID ==================");
        for (RestaurantTable t : tableRepository.findAll()) {
            log.info("[{}] ID: {} | Token: {}", t.getName(), t.getId(), t.getQrToken());
        }
        log.info("=======================================================");
    }

    private RestaurantTable createTable(String name, int capacity, String area, TableStatus status, String qrToken) {
        RestaurantTable t = new RestaurantTable();
        t.setName(name); t.setCapacity(capacity); t.setArea(area); t.setStatus(status); t.setQrToken(qrToken);
        return t;
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
}
