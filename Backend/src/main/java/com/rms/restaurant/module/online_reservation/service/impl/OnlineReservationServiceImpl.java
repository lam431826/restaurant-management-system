package com.rms.restaurant.module.online_reservation.service.impl;

import com.rms.restaurant.module.online_reservation.dto.AvailabilityRequest;
import com.rms.restaurant.module.online_reservation.dto.AvailabilityResponse;
import com.rms.restaurant.module.online_reservation.dto.OnlineReservationRequest;
import com.rms.restaurant.module.online_reservation.service.OnlineReservationService;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class OnlineReservationServiceImpl implements OnlineReservationService {

    @Override public AvailabilityResponse checkAvailability(AvailabilityRequest request) { return null; }
    @Override public ReservationResponse create(OnlineReservationRequest request) { return null; }
    @Override public void cancel(String id, String phone) {}
}
