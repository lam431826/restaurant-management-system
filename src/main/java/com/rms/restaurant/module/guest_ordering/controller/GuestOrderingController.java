package com.rms.restaurant.module.guest_ordering.controller;

import com.rms.restaurant.module.guest_ordering.service.GuestOrderingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/guest")
@RequiredArgsConstructor
public class GuestOrderingController {
    private final GuestOrderingService guestOrderingService;
}
