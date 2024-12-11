package com.example.web_service.service;

import com.example.web_service.entity.Role;
import com.example.web_service.repository.RoleRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class RoleService {
    
    @Autowired
    private RoleRepository roleRepository;
    
    @Autowired
    private ObjectMapper objectMapper;

    public List<Role> findAll() {
        return roleRepository.findAll();
    }

    public Role findById(Long id) {
        return roleRepository.findById(id).orElse(null);
    }

    public Role save(Role role) {
        if (role.getPermissions() != null && role.getPermissions().isTextual()) {
            // 如果权限是字符串格式，将其转换为 JsonNode
            try {
                String permissionsStr = role.getPermissions().asText();
                role.setPermissions(objectMapper.readTree(permissionsStr));
            } catch (Exception e) {
                throw new RuntimeException("Invalid permissions format", e);
            }
        }
        return roleRepository.save(role);
    }

    public void deleteById(Long id) {
        roleRepository.deleteById(id);
    }

    public List<Role> search(String keyword) {
        return roleRepository.search(keyword);
    }
} 