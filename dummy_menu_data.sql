-- Hướng dẫn: 
-- Bạn có thể sửa data trong file này cho đúng menu thực tế của nhà hàng.
-- Sau đó, copy nội dung này vào một script Flyway mới (Ví dụ tạo file: Backend\src\main\resources\db\migration\V10__insert_menu_data.sql) 
-- Hoặc chạy trực tiếp script này trong SQL Server Studio.

-- 1. Xóa dữ liệu cũ (Bỏ comment nếu muốn xóa trắng trước khi chèn)
DELETE FROM order_items;
DELETE FROM menu_items;
DELETE FROM menu_categories;

-- 2. Chèn dữ liệu Danh mục (Categories)
INSERT INTO menu_categories (id, name, display_order, icon) VALUES 
('CAT-001', N'Gợi ý Bán chạy', 1, N'🔥'),
('CAT-002', N'Món Chính', 2, N'🍛'),
('CAT-003', N'Đồ Uống', 3, N'🍹'),
('CAT-004', N'Tráng Miệng', 4, N'🍰');

-- 3. Chèn dữ liệu Món ăn (Menu Items)
-- (Chú ý: category_id phải khớp với id ở bảng menu_categories phía trên)
INSERT INTO menu_items (id, category_id, name, price, description, image_url, available, updated_at) VALUES 
-- Món Bán Chạy
('ITEM-001', 'CAT-001', N'Cơm Rang Dưa Bò', 55000, N'Cơm rang giòn cùng dưa chua và thịt bò mềm', NULL, 1, GETDATE()),
('ITEM-002', 'CAT-001', N'Phở Bò Thập Cẩm', 65000, N'Phở bò truyền thống nước dùng tủy xương hầm 12 tiếng', NULL, 1, GETDATE()),

-- Món Chính
('ITEM-003', 'CAT-002', N'Bún Chả Nướng Than', 50000, N'Bún chả nướng than hoa thơm lừng', NULL, 1, GETDATE()),
('ITEM-004', 'CAT-002', N'Bò Né Kèm Bánh Mì', 75000, N'Bò né chảo gang xèo xèo kèm pate và trứng ốp la', NULL, 1, GETDATE()),

-- Đồ Uống
('ITEM-005', 'CAT-003', N'Trà Đá', 5000, N'Trà đá mát lạnh giải nhiệt', NULL, 1, GETDATE()),
('ITEM-006', 'CAT-003', N'Nước Ép Cam Tươi', 35000, N'Nước cam vắt nguyên chất 100%', NULL, 1, GETDATE()),
('ITEM-007', 'CAT-003', N'Bia Tiger Bạc', 25000, N'Bia ướp lạnh', NULL, 1, GETDATE()),

-- Tráng Miệng
('ITEM-008', 'CAT-004', N'Bánh Flan Caramel', 20000, N'Bánh flan mềm mịn béo ngậy', NULL, 1, GETDATE()),
('ITEM-009', 'CAT-004', N'Chè Khúc Bạch', 25000, N'Chè khúc bạch thanh mát', NULL, 0, GETDATE()); -- available = 0 (tạm hết)
