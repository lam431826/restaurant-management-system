package com.rms.restaurant.module.guest_ordering.controller;

import com.rms.restaurant.module.guest_ordering.dto.AssistanceRequest;
import com.rms.restaurant.module.guest_ordering.service.GuestOrderingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/guest/assistance")
@RequiredArgsConstructor
public class GuestAssistanceController {

    private final GuestOrderingService guestOrderingService;

    @PostMapping
    public ResponseEntity<Void> requestAssistance(@jakarta.validation.Valid @RequestBody AssistanceRequest request) {
        guestOrderingService.requestAssistance(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
