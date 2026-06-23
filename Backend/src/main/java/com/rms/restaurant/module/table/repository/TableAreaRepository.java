package com.rms.restaurant.module.table.repository;

import com.rms.restaurant.module.table.model.TableArea;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TableAreaRepository extends JpaRepository<TableArea, String> {

    List<TableArea> findAllByOrderByDisplayOrderAsc();

    boolean existsByNameIgnoreCase(String name);

    Optional<TableArea> findByNameIgnoreCase(String name);
}
