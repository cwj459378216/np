package com.example.web_service.common.config;

import java.time.LocalDateTime;

import org.apache.ibatis.reflection.MetaObject;
import org.springframework.context.annotation.Configuration;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;

@Configuration
public class OmniMetaHandler implements MetaObjectHandler {

    public OmniMetaHandler() {
    }

    @Override
    public void insertFill(MetaObject metaObject) {
        LocalDateTime now = LocalDateTime.now();
        this.setFieldValByName("creationTime", now, metaObject);
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        LocalDateTime now = LocalDateTime.now();
        this.setFieldValByName("updateTime", now, metaObject);
        this.setFieldValByName("modifiedTime", now, metaObject);
    }
}
