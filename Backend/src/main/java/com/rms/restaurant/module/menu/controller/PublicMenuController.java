package com.rms.restaurant.module.menu.controller;

import com.rms.restaurant.module.menu.service.MenuService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.rms.restaurant.module.menu.dto.PublicMenuResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@RestController
@RequestMapping("/api/menu/public")
@RequiredArgsConstructor
public class PublicMenuController {
    private final MenuService menuService;

    @GetMapping
    public ResponseEntity< List<PublicMenuResponse>> getPublicMenu() {
        return ResponseEntity.ok(menuService.getPublicMenu());
    }
}
