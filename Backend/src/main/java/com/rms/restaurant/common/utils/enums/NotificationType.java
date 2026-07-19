package com.rms.restaurant.common.utils.enums;

public enum NotificationType {
    PENDING,       // Đặt bàn đang chờ xác nhận
    CONFIRMATION,  // Đặt bàn đã được xác nhận bởi nhân viên
    REMINDER,      // Nhắc nhở 1 tiếng trước giờ đặt
    CANCELLATION,  // Đặt bàn đã bị huỷ
    PAYMENT,       // Thanh toán thành công
    TABLE_UPDATE,  // Xếp bàn / chuyển bàn
    NO_SHOW        // Khách không đến sau grace period (BR-04)
}
