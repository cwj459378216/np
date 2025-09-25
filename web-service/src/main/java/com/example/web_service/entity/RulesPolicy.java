package com.example.web_service.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.util.List;
import java.util.ArrayList;

@Data
@Entity
@Table(name = "rules_policy")
public class RulesPolicy {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private String description;
    private Boolean enabled = false;
    
    @Column(name = "is_default")
    private Boolean isDefault = false;
    
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "policy_rules",
        joinColumns = @JoinColumn(name = "policy_id"),
        inverseJoinColumns = @JoinColumn(name = "rule_id")
    )
    private List<Rule> rules = new ArrayList<>();
} 