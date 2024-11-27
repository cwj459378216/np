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

    ::ng-deep .tippy-box {
      position: fixed !important;
      max-height: calc(100vh - 100px) !important;
      max-width: min(1200px, calc(100vw - 40px)) !important;
      overflow: hidden !important;
      background: white !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
    }

    ::ng-deep .tippy-content {
      padding: 0 !important;
      overflow: auto !important;
      max-height: inherit !important;
      color: #1e293b !important;
      font-size: 13px !important;
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 #f1f5f9;
    }

    ::ng-deep .tooltip-table {
      position: relative;
      width: 100%;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
    }

    ::ng-deep .tooltip-table table {
      border-collapse: separate;
      border-spacing: 0;
      width: 100%;
      table-layout: fixed;
      min-width: 1200px;
    }

    ::ng-deep .tooltip-table th {
      padding: 12px 8px;
      font-weight: 600;
      text-align: left;
      border-bottom: 2px solid #e2e8f0;
      white-space: nowrap;
      color: #475569;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #f8fafc;
    }

    ::ng-deep .tooltip-table td {
      padding: 8px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
      background: white;
      transition: background-color 0.15s ease;
      font-size: 12px;
      line-height: 1.4;
      white-space: normal;
      word-break: break-word;
    }

    ::ng-deep .tooltip-table th:nth-child(1),
    ::ng-deep .tooltip-table td:nth-child(1) {
      width: 7%;
    }
    ::ng-deep .tooltip-table th:nth-child(2),
    ::ng-deep .tooltip-table td:nth-child(2) {
      width: 6%;
    }
    ::ng-deep .tooltip-table th:nth-child(3),
    ::ng-deep .tooltip-table td:nth-child(3) {
      width: 15%;
    }
    ::ng-deep .tooltip-table th:nth-child(4),
    ::ng-deep .tooltip-table td:nth-child(4) {
      width: 7%;
    }
    ::ng-deep .tooltip-table th:nth-child(5),
    ::ng-deep .tooltip-table td:nth-child(5) {
      width: 15%;
    }
    ::ng-deep .tooltip-table th:nth-child(6),
    ::ng-deep .tooltip-table td:nth-child(6) {
      width: 7%;
    }
    ::ng-deep .tooltip-table th:nth-child(7),
    ::ng-deep .tooltip-table td:nth-child(7) {
      width: 15%;
    }
    ::ng-deep .tooltip-table th:nth-child(8),
    ::ng-deep .tooltip-table td:nth-child(8) {
      width: 10%;
    }
    ::ng-deep .tooltip-table th:nth-child(9),
    ::ng-deep .tooltip-table td:nth-child(9) {
      width: 18%;
    }

    ::ng-deep .tippy-content::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    ::ng-deep .tippy-content::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 3px;
    }

    ::ng-deep .tippy-content::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }

    ::ng-deep .tippy-content::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
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
    { field: 'sourceAddress', title: 'Src.IP' },
    { field: 'sourcePort', title: 'Src.Port' },
    { field: 'destinationAddress', title: 'Dst.IP' },
    { field: 'destinationPort', title: 'Dst.Port' },
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
    },
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
    },
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
    },
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
    },{
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
    ,{
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
      sourceAddress: '192.168.1.0/24',
      sourcePort: '80',
      destinationAddress: '10.0.0.0/8',
      destinationPort: '443',
      classType: 'web-application-attack',
      cve: 'CVE-2023-1234',
      reference: 'bugtraq,1234'
    },
    {
      sid: '1000002',
      protocol: 'UDP',
      sourceAddress: 'any',
      sourcePort: '53',
      destinationAddress: '192.168.0.0/16',
      destinationPort: 'any',
      classType: 'attempted-recon',
      cve: 'CVE-2023-5678',
      reference: 'url,example.com/vuln'
    }
  ];

  // 添加 document.body 的引用
  documentBody = document.body;

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

  getRuleTooltipContent(rules: any[]): string {
    return `
      <div class="tooltip-table">
        <table class="w-full table-auto">
          <thead>
            <tr>
              <th>SID</th>
              <th>Protocol</th>
              <th>Src.IP</th>
              <th>Src.Port</th>
              <th>Dst.IP</th>
              <th>Dst.Port</th>
              <th>ClassType</th>
              <th>CVE</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            ${rules.map(rule => `
              <tr>
                <td>${rule.sid}</td>
                <td>${rule.protocol}</td>
                <td>${rule.sourceAddress}</td>
                <td>${rule.sourcePort}</td>
                <td>${rule.destinationAddress}</td>
                <td>${rule.destinationPort}</td>
                <td>${rule.classType}</td>
                <td>${rule.cve}</td>
                <td>${rule.reference}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
} 