package com.example.web_service.repository;

import com.example.web_service.entity.AgingSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AgingScheduleRepository extends JpaRepository<AgingSchedule, Long> {
    // 由于通常只有一个调度配置，我们可以添加一个方法来获取第一个配置
    AgingSchedule findFirstByOrderByIdAsc();
}
