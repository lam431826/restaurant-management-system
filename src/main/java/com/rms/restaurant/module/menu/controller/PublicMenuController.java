package com.rms.restaurant.module.menu.controller;

import com.rms.restaurant.module.menu.service.MenuService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/menu/public")
@RequiredArgsConstructor
public class PublicMenuController {
    private final MenuService menuService;
}
