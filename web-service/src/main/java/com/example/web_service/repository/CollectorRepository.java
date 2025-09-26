package com.example.web_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.example.web_service.entity.Collector;
import java.util.List;

public interface CollectorRepository extends JpaRepository<Collector, Long> {
    
    /**
     * 根据interfaceName查询所有collector
     */
    List<Collector> findByInterfaceName(String interfaceName);
    
    /**
     * 根据interfaceName查询所有sessionId（过滤掉null和空字符串）
     */
    @Query("SELECT DISTINCT c.sessionId FROM Collector c WHERE c.interfaceName = :interfaceName AND c.sessionId IS NOT NULL AND c.sessionId != ''")
    List<String> findSessionIdsByInterfaceName(@Param("interfaceName") String interfaceName);
} 