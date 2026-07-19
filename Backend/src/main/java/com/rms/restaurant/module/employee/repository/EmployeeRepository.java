package com.rms.restaurant.module.employee.repository;

import com.rms.restaurant.common.utils.enums.EmployeeStatus;
import com.rms.restaurant.module.employee.model.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EmployeeRepository extends JpaRepository<Employee, String> {

    boolean existsByCode(String code);

    boolean existsByPhone(String phone);

    boolean existsByPhoneAndIdNot(String phone, String id);

    boolean existsByUserId(String userId);

    @Query("SELECT e FROM Employee e WHERE " +
           "(:code IS NULL OR e.code = :code) AND " +
           "(:name IS NULL OR LOWER(e.name) LIKE LOWER(CONCAT('%', :name, '%'))) AND " +
           "(:phone IS NULL OR e.phone LIKE CONCAT('%', :phone, '%')) AND " +
           "(:status IS NULL OR e.status = :status)")
    Page<Employee> search(@Param("code") String code,
                          @Param("name") String name,
                          @Param("phone") String phone,
                          @Param("status") EmployeeStatus status,
                          Pageable pageable);

    @Query("SELECT e FROM Employee e WHERE " +
           "(:code IS NULL OR e.code = :code) AND " +
           "(:name IS NULL OR LOWER(e.name) LIKE LOWER(CONCAT('%', :name, '%'))) AND " +
           "(:phone IS NULL OR e.phone LIKE CONCAT('%', :phone, '%')) AND " +
           "(:status IS NULL OR e.status = :status)")
    List<Employee> search(@Param("code") String code,
                          @Param("name") String name,
                          @Param("phone") String phone,
                          @Param("status") EmployeeStatus status);

    List<Employee> findByIdIn(List<String> ids);
}
