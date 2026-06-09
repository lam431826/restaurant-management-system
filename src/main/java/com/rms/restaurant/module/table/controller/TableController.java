package com.rms.restaurant.module.table.controller;

import com.rms.restaurant.module.table.service.TableService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tables")
@RequiredArgsConstructor
public class TableController {
    private final TableService tableService;
}
