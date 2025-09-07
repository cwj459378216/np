package com.example.web_service.repository;

import com.example.web_service.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    Optional<Report> findTopByOrderByCreatedAtDesc();
    
    // 查询与指定模板关联的报告
    List<Report> findByTemplateId(Long templateId);
    
    // 检查是否存在与指定模板关联的报告
    boolean existsByTemplateId(Long templateId);
    
    // 计算与指定模板关联的报告数量
    @Query("SELECT COUNT(r) FROM Report r WHERE r.templateId = :templateId")
    long countByTemplateId(@Param("templateId") Long templateId);
} 