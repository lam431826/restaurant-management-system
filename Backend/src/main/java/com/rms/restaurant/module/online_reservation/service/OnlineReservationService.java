package com.rms.restaurant.module.online_reservation.service;

import com.rms.restaurant.module.online_reservation.dto.OnlineReservationRequest;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;

public interface OnlineReservationService {

    // ORM-02: Khách tạo đặt bàn → status PENDING, gửi email "đang chờ xác nhận"
    ReservationResponse create(OnlineReservationRequest request);
}
