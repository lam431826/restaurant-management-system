package com.rms.restaurant.module.online_reservation.service;

import com.rms.restaurant.module.online_reservation.dto.AvailabilityRequest;
import com.rms.restaurant.module.online_reservation.dto.AvailabilityResponse;
import com.rms.restaurant.module.online_reservation.dto.OnlineCancelConfirmInput;
import com.rms.restaurant.module.online_reservation.dto.OnlineCancelRequestInput;
import com.rms.restaurant.module.online_reservation.dto.OnlineCancelRequestResponse;
import com.rms.restaurant.module.online_reservation.dto.OnlineReservationRequest;
import com.rms.restaurant.module.reservation.dto.ReservationResponse;

public interface OnlineReservationService {

    AvailabilityResponse checkAvailability(AvailabilityRequest request);

    // ORM-02: Khách tạo đặt bàn → status PENDING, gửi email "đang chờ xác nhận"
    ReservationResponse create(OnlineReservationRequest request);

    // ORM-03 bước 1: Xác thực SĐT, gửi OTP huỷ về email
    OnlineCancelRequestResponse requestCancellation(String reservationId, OnlineCancelRequestInput input);

    // ORM-03 bước 2: Xác nhận OTP → huỷ đặt bàn
    void confirmCancellation(String reservationId, OnlineCancelConfirmInput input);
}
