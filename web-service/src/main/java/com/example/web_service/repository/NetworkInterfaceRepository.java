package com.example.web_service.repository;

import com.example.web_service.entity.NetworkInterface;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NetworkInterfaceRepository extends JpaRepository<NetworkInterface, Long> {
    @Query("SELECT n FROM NetworkInterface n WHERE " +
           "LOWER(n.interface_name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(n.ip_address) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<NetworkInterface> search(@Param("keyword") String keyword);
} 