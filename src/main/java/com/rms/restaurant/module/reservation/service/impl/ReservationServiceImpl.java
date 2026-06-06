package com.rms.restaurant.module.reservation.service.impl;

import com.rms.restaurant.common.utils.wrapper.PageResponse;
import com.rms.restaurant.module.reservation.dto.CreateReservationRequest;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;
import com.rms.restaurant.module.reservation.dto.UpdateReservationRequest;
import com.rms.restaurant.module.reservation.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ReservationServiceImpl implements ReservationService {

    @Override public PageResponse<ReservationResponse> list(Pageable pageable) { return null; }
    @Override public ReservationResponse getById(String id) { return null; }
    @Override public ReservationResponse create(CreateReservationRequest request, String createdBy) { return null; }
    @Override public ReservationResponse update(String id, UpdateReservationRequest request) { return null; }
    @Override public void cancel(String id) {}
    @Override public void checkIn(String id) {}
    @Override public void markNoShow(String id) {}
}
