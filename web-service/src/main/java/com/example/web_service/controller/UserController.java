package com.example.web_service.controller;

import com.example.web_service.entity.User;
import com.example.web_service.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@Tag(name = "用户管理", description = "用户的增删改查操作")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping
    @Operation(summary = "获取所有用户", description = "获取系统中所有的用户")
    public List<User> getAllUsers() {
        return userService.findAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取单个用户", description = "根据ID获取特定的用户")
    public User getUserById(@PathVariable Long id) {
        return userService.findById(id);
    }

    @PostMapping
    @Operation(summary = "创建用户", description = "创建新的用户")
    public User createUser(@RequestBody User user) {
        return userService.save(user);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新用户", description = "更新已存在的用户")
    public User updateUser(@PathVariable Long id, @RequestBody User user) {
        user.setId(id);
        return userService.save(user);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除用户", description = "删除指定的用户")
    public void deleteUser(@PathVariable Long id) {
        userService.deleteById(id);
    }

    @GetMapping("/search")
    @Operation(summary = "搜索用户", description = "根据关键字搜索用户")
    public List<User> searchUsers(@RequestParam String keyword) {
        return userService.search(keyword);
    }

    @GetMapping("/check-username")
    @Operation(summary = "检查用户名", description = "检查用户名是否已存在")
    public boolean checkUsername(@RequestParam String username) {
        return userService.existsByUsername(username);
    }

    @GetMapping("/check-email")
    @Operation(summary = "检查邮箱", description = "检查邮箱是否已存在")
    public boolean checkEmail(@RequestParam String email) {
        return userService.existsByEmail(email);
    }
} 