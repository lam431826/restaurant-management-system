package com.rms.restaurant.module.reservation.service;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.reservation.dto.CreateReservationRequest;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;
import com.rms.restaurant.module.reservation.dto.UpdateReservationRequest;
import org.springframework.data.domain.Pageable;

public interface ReservationService {
    PageResponse<ReservationResponse> list(Pageable pageable);
    ReservationResponse getById(String id);
    ReservationResponse create(CreateReservationRequest request, String createdBy);
    ReservationResponse update(String id, UpdateReservationRequest request);
    void cancel(String id);
    ReservationResponse checkIn(String id);
    void markNoShow(String id);
}
