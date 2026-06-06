package com.rms.restaurant.module.online_reservation.controller;

import com.rms.restaurant.module.online_reservation.service.OnlineReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/online/reservations")
@RequiredArgsConstructor
public class OnlineReservationController {
    private final OnlineReservationService onlineReservationService;
}
