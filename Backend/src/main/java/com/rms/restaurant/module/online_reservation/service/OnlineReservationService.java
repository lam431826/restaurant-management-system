package com.rms.restaurant.module.online_reservation.service;

import com.rms.restaurant.module.online_reservation.dto.AvailabilityRequest;
import com.rms.restaurant.module.online_reservation.dto.AvailabilityResponse;
import com.rms.restaurant.module.online_reservation.dto.OnlineReservationRequest;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;

public interface OnlineReservationService {
    AvailabilityResponse checkAvailability(AvailabilityRequest request);
    ReservationResponse create(OnlineReservationRequest request);
    void cancel(String id, String phone);
}
