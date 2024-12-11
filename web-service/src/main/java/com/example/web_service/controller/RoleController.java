package com.example.web_service.controller;

import com.example.web_service.entity.Role;
import com.example.web_service.service.RoleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

@RestController
@RequestMapping("/api/roles")
@Tag(name = "角色管理", description = "角色的增删改查操作")
@CrossOrigin(origins = "*")
public class RoleController {

    @Autowired
    private RoleService roleService;

    @GetMapping
    @Operation(summary = "获取所有角色", description = "获取系统中所有的角色")
    public List<Role> getAllRoles() {
        return roleService.findAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取单个角色", description = "根据ID获取特定的角色")
    public Role getRoleById(@PathVariable Long id) {
        return roleService.findById(id);
    }

    @PostMapping
    @Operation(summary = "创建角色", description = "创建新的角色")
    public Role createRole(@RequestBody Role role) {
        return roleService.save(role);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新角色", description = "更新已存在的角色")
    public Role updateRole(@PathVariable Long id, @RequestBody Role role) {
        role.setId(id);
        return roleService.save(role);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除角色", description = "删除指定的角色")
    public void deleteRole(@PathVariable Long id) {
        roleService.deleteById(id);
    }

    @GetMapping("/search")
    @Operation(summary = "搜索角色", description = "根据关键字搜索角色")
    public List<Role> searchRoles(@RequestParam String keyword) {
        return roleService.search(keyword);
    }
} 