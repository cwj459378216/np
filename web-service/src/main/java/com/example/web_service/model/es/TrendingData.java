package com.example.web_service.model.es;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TrendingData {
    private Long timestamp;
    private Long count;
} 