import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NgxCustomModalComponent } from 'ngx-custom-modal';

@Component({
  selector: 'app-rules-policy',
  templateUrl: './rules-policy.component.html',
  styles: [`
    ::ng-deep .rules-policy-modal {
      .modal-content {
        width: 95vw !important;
        max-width: 95vw !important;
        height: 90vh !important;
        max-height: 90vh !important;
        margin: 2.5vh auto;
      }
      
      .modal-body {
        height: calc(90vh - 130px) !important;
        overflow-y: auto;
        padding: 20px;
      }

      .modal-header {
        padding: 20px;
        background: #fff;
        border-bottom: 1px solid #e0e6ed;
      }
    }

    ::ng-deep .group:hover .group-hover\\:block {
      animation: fadeIn 0.2s ease-in-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    ::ng-deep .table-responsive {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    ::ng-deep .table-hover tr:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
  `]
})
export class RulesPolicyComponent {
  @ViewChild('addRuleModal') addRuleModal!: NgxCustomModalComponent;
  
  searchTerm: string = '';
  policyForm: FormGroup;
  selectedRules: any[] = [];
  
  // 修改表格列配置
  ruleColumns = [
    { field: 'sid', title: 'SID' },
    { field: 'protocol', title: 'Protocol' },
    { field: 'sourceAddress', title: 'Source Address' },
    { field: 'sourcePort', title: 'Source Port' },
    { field: 'destinationAddress', title: 'Destination Address' },
    { field: 'destinationPort', title: 'Destination Port' },
    { field: 'classType', title: 'ClassType' },
    { field: 'cve', title: 'CVE' },
    { field: 'reference', title: 'Reference' }
  ];
  
  // 修改示例数据
  availableRules = [
    {
      id: 1,
      sid: '1000001',
      protocol: 'TCP',
      sourceAddress: 'any',
      sourcePort: 'any',
      destinationAddress: '192.168.1.0/24',
      destinationPort: '80',
      classType: 'web-application-attack',
      cve: 'CVE-2023-1234',
      reference: 'bugtraq,1234',
      selected: false
    },
    {
      id: 2,
      sid: '1000002',
      protocol: 'UDP',
      sourceAddress: '10.0.0.0/8',
      sourcePort: '53',
      destinationAddress: 'any',
      destinationPort: 'any',
      classType: 'attempted-recon',
      cve: 'CVE-2023-5678',
      reference: 'url,example.com',
      selected: false
    },
    {
      id: 3,
      sid: '1000003',
      protocol: 'TCP',
      sourceAddress: 'any',
      sourcePort: 'any',
      destinationAddress: '192.168.1.100',
      destinationPort: '443',
      classType: 'attempted-admin',
      cve: 'CVE-2023-9012',
      reference: 'cve,2023-9012',
      selected: false
    }
  ];

  // 添加策略规则数据
  policyRules = [
    {
      sid: '1000001',
      protocol: 'TCP',
      sourceAddress: 'any',
      sourcePort: 'any',
      destinationAddress: '192.168.1.0/24',
      destinationPort: '80',
      classType: 'web-application-attack',
      cve: 'CVE-2023-1234'
    },
    {
      sid: '1000002',
      protocol: 'TCP',
      sourceAddress: 'any',
      sourcePort: 'any',
      destinationAddress: '192.168.1.0/24',
      destinationPort: '443',
      classType: 'web-application-attack',
      cve: 'CVE-2023-5678'
    }
  ];

  constructor(private fb: FormBuilder) {
    this.policyForm = this.fb.group({
      id: [''],
      name: [''],
      description: ['']
    });
  }

  editRule(policy?: any) {
    if (policy) {
      this.policyForm.patchValue(policy);
    } else {
      this.policyForm.reset();
    }
    this.addRuleModal.open();
  }

  deleteRule() {
    // 实现删除规则的逻辑
  }

  searchRules() {
    // 实现搜索规则的逻辑
  }

  toggleStatus(event: any) {
    console.log('Status changed:', event.target.checked);
  }

  toggleAllRules(event: any) {
    const checked = event.target.checked;
    this.availableRules = this.availableRules.map(rule => ({
      ...rule,
      selected: checked
    }));
  }

  toggleRule(rule: any) {
    rule.selected = !rule.selected;
  }

  onSelectedRulesChange(rows: any) {
    this.selectedRules = rows.selectedRows;
    console.log('Selected rules:', this.selectedRules);
  }

  savePolicy() {
    if (this.policyForm.valid) {
      const formData = {
        ...this.policyForm.value,
        rules: this.selectedRules
      };
      console.log('Save policy:', formData);
      this.addRuleModal.close();
    }
  }
} 