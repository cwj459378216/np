package com.example.web_service.repository;

import com.example.web_service.entity.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Long> {
    @Query("SELECT a FROM Asset a WHERE " +
           "LOWER(a.asset_name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(a.ip_address) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(a.mac_address) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Asset> search(@Param("keyword") String keyword);
} 