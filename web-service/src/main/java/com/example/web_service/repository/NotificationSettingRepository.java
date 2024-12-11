package com.example.web_service.repository;

import com.example.web_service.entity.NotificationSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationSettingRepository extends JpaRepository<NotificationSetting, Long> {
    @Query("SELECT n FROM NotificationSetting n WHERE " +
           "LOWER(n.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(n.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(n.service) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<NotificationSetting> search(@Param("keyword") String keyword);
} 