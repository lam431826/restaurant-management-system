package com.rms.restaurant.module.reservation.service;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.reservation.dto.CreateReservationRequest;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;
import com.rms.restaurant.module.reservation.dto.UpdateReservationRequest;
import org.springframework.data.domain.Pageable;

public interface ReservationService {
    PageResponse<ReservationResponse> list(Pageable pageable);
    ReservationResponse getById(String id);
    ReservationResponse create(CreateReservationRequest request);  // Staff tạo qua điện thoại → auto CONFIRMED
    // Chỉ khách tạo reservation (qua /api/online/reservations) — staff không tạo trực tiếp
    ReservationResponse confirm(String id);       // PENDING → CONFIRMED + gửi NM-01
    ReservationResponse update(String id, UpdateReservationRequest request);
    void cancel(String id);                       // Staff huỷ (PENDING/CONFIRMED → CANCELLED)
    ReservationResponse checkIn(String id);       // CONFIRMED → CHECKED_IN
    void markNoShow(String id);                   // CONFIRMED → NO_SHOW
}
