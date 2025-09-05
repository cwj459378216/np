import { Component, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { RulesPolicyService } from '../../../services/rules-policy.service';
import { RulesPolicy, Rule } from '../../../models/rules-policy.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-rules-policy',
  templateUrl: './rules-policy.component.html',
  styleUrls: ['./rules-policy.component.scss']
})
export class RulesPolicyComponent implements AfterViewInit {
  @ViewChild('addRuleModal') addRuleModal!: NgxCustomModalComponent;
  @ViewChild('datatable') set datatable(dt: any) {
    if (dt) {
      console.log('Datatable initialized:', dt);
      this._datatable = dt;

      if (this.pendingEditPolicy) {
        console.log('Processing pending edit policy:', this.pendingEditPolicy);
        this.initDatatableSelection(this.pendingEditPolicy);
        this.pendingEditPolicy = undefined;
      }
    }
  }
  private _datatable: any;
  private pendingEditPolicy: RulesPolicy | undefined;
  private isInitializing: boolean = false;
  selectedAll: boolean = false;

  searchTerm = '';
  policyForm: FormGroup;
  selectedRules: Rule[] = [];
  availableRules: Rule[] = [];
  policies: RulesPolicy[] = [];

  // 修改表格列配置
  ruleColumns = [
    { field: 'id', title: 'ID', visible: false },
    { field: 'sid', title: 'SID' },
    { field: 'protocol', title: 'Protocol' },
    { field: 'direction', title: 'Direction' },
    { field: 'srcPort', title: 'Src.Port' },
    { field: 'dstPort', title: 'Dst.Port' },
    { field: 'msg', title: 'Message' },
    { field: 'classType', title: 'ClassType' },
    { field: 'priority', title: 'Priority' },
    { field: 'cve', title: 'CVE' },
    { field: 'filename', title: 'File' }
  ];

  // 添加策略规则数据
  /*
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
  */

  // 添加 document.body 的引用
  documentBody = document.body;

  constructor(
    private fb: FormBuilder,
    private rulesPolicyService: RulesPolicyService
  ) {
    this.policyForm = this.fb.group({
      id: [''],
      name: [''],
      description: ['']
    });
    this.loadPolicies();
    this.loadRules();
  }

  ngAfterViewInit() {
    console.log('View initialized');
  }

  loadPolicies(): void {
    this.rulesPolicyService.getAllPolicies().subscribe(
      (policies: RulesPolicy[]) => {
        this.policies = policies;
        console.log('Loaded policies with rules:', policies.map(policy => ({
          id: policy.id,
          name: policy.name,
          ruleCount: policy.rules.length,
          rules: policy.rules.map(rule => ({
            id: rule.id,
            sid: rule.sid
          }))
        })));
      },
      (error: Error) => {
        console.error('Error loading policies:', error);
      }
    );
  }

  loadRules(): void {
    this.rulesPolicyService.getAllRules().subscribe(
      (rules: Rule[]) => {
        console.log('Loaded rules:', rules);
        this.availableRules = rules;
      },
      (error: Error) => {
        console.error('Error loading rules:', error);
      }
    );
  }

  editRule(policy?: RulesPolicy) {
    console.log('Edit rule called with policy:', policy);
    this.isInitializing = true;

    if (policy) {
      this.policyForm.patchValue(policy);
      this.selectedRules = policy.rules || [];
    } else {
      this.policyForm.reset();
      this.selectedRules = [];
    }

    this.addRuleModal.open();

    this.pendingEditPolicy = policy;

    const checkAndInitialize = () => {
      console.log('Checking datatable initialization...');
      if (this._datatable && this._datatable.rows) {
        this.initDatatableSelection(policy);
        this.pendingEditPolicy = undefined;
        this.isInitializing = false;
      } else {
        console.log('Datatable not ready, retrying...');
        setTimeout(checkAndInitialize, 100);
      }
    };

    setTimeout(checkAndInitialize, 200);
  }

  private initDatatableSelection(policy?: RulesPolicy) {
    if (this.isInitializing) {
      console.log('Initializing datatable selection...');
      const maxAttempts = 20;
      let attempts = 0;

      const tryInitialize = () => {
        if (!this._datatable || !this._datatable.rows) {
          if (attempts < maxAttempts) {
            attempts++;
            console.log(`Waiting for datatable to initialize... Attempt ${attempts}`);
            setTimeout(tryInitialize, 100);
            return;
          }
          console.error('Failed to initialize datatable after maximum attempts');
          return;
        }

        console.log('Datatable initialized, proceeding with selection');
        this.handleDatatableSelection(policy);
      };

      tryInitialize();
    }
  }

  private handleDatatableSelection(policy?: RulesPolicy) {
    if (!this._datatable || !this._datatable.rows) {
      console.error('Datatable not properly initialized');
      return;
    }

    console.log('Handling datatable selection');
    this._datatable.selectAll(false);

    if (policy) {
      console.log('Handling edit mode with policy:', policy);
      const rows = this._datatable.rows;

      this.selectedRules = this.selectedRules.filter(selected =>
        rows.some((row: Rule) => row.id === selected.id)
      );

      rows.forEach((row: Rule, index: number) => {
        if (this.selectedRules.some(r => r.id === row.id)) {
          console.log('Selecting row:', index, row);
          this._datatable.selectRow(index);
        }
      });

      if (this.selectedRules.length === rows.length) {
        console.log('Setting select all to true');
        this._datatable.selectAll(true);
      }
    } else {
      console.log('Handling create mode - no default selection');
      this.selectedRules = [];
    }
  }

  deleteRule(id: number): void {
    // 显示确认对话框
    Swal.fire({
        title: 'Delete Policy',
        text: 'Are you sure you want to delete this policy?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        padding: '2em',
    }).then((result) => {
        if (result.value) {
            // 用户确认删除
            this.rulesPolicyService.deletePolicy(id).subscribe(
                () => {
                    console.log('Policy deleted');
                    // 从本地数组中移除被删除的策略
                    this.policies = this.policies.filter(policy => policy.id !== id);
                    // 显示成功消息
                    this.showMessage('Policy has been deleted successfully');
                },
                (error: Error) => {
                    console.error('Error deleting policy:', error);
                    // 显示错误消息
                    this.showMessage('Failed to delete policy', 'error');
                }
            );
        }
    });
  }

  searchRules() {
    // 实现搜索规则的逻辑
  }

  toggleStatus(id: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;

    // 找到要更新的策略
    const policyToUpdate = this.policies.find(p => p.id === id);
    if (!policyToUpdate) {
      console.error('Policy not found:', id);
      return;
    }

    this.rulesPolicyService.updatePolicyStatus(id, checked).subscribe(
      () => {
        console.log('Policy status updated');
        // 直接更新本地状态，而不是重新加载
        policyToUpdate.enabled = checked;
        this.showMessage(`Policy ${checked ? 'enabled' : 'disabled'} successfully`);
      },
      (error: Error) => {
        console.error('Error updating policy status:', error);
        // 发生错误时恢复复选框状态
        target.checked = !checked;
        policyToUpdate.enabled = !checked;
        this.showMessage('Failed to update policy status', 'error');
      }
    );
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

  onSelectedRulesChange(event: any): void {
    console.log('Selected rows:', event);
    this.selectedRules = event;

    if (this._datatable) {
      const totalRows = this._datatable.rows?.length || this.availableRules.length;
      this._datatable.selectedAll = this.selectedRules.length === totalRows;
    }
  }

  savePolicy(): void {
    if (this.policyForm.valid) {
      const formData = this.policyForm.value;
      console.log('Form data before save:', formData);
      console.log('Selected rules before save:', this.selectedRules);

    const policy = {
        ...formData,
        enabled: false,
        rules: this.selectedRules.map(rule => ({
      id: rule.id,
      sid: rule.sid
        }))
      };

      console.log('Final policy data:', policy);

      this.rulesPolicyService.createPolicy(policy).subscribe(
        (response) => {
          console.log('Created policy:', response);
          this.showMessage('Policy has been created successfully');
          this.addRuleModal.close();
          this.loadPolicies();
          this.selectedRules = [];
          this.initForm();
        },
        (error) => {
          console.error('Error creating policy:', error);
          this.showMessage('Error creating policy', 'error');
        }
      );
    }
  }

  getRuleTooltipContent(rules: Rule[] | undefined): string {
    if (!rules || rules.length === 0) {
        return '<div class="tooltip-table">No rules defined</div>';
    }

    return `
        <div class="tooltip-table">
            <table class="w-full table-auto">
                <thead>
                    <tr>
                        <th>SID</th>
                        <th>Protocol</th>
                        <th>Direction</th>
                        <th>Src.Port</th>
                        <th>Dst.Port</th>
                        <th>Message</th>
                        <th>ClassType</th>
                        <th>Priority</th>
                        <th>CVE</th>
                        <th>File</th>
                    </tr>
                </thead>
                <tbody>
                    ${rules.map(rule => `
                        <tr>
                            <td>${rule.sid ?? ''}</td>
                            <td>${rule.protocol ?? ''}</td>
                            <td>${rule.direction ?? ''}</td>
                            <td>${rule.srcPort ?? ''}</td>
                            <td>${rule.dstPort ?? ''}</td>
                            <td>${rule.msg ?? ''}</td>
                            <td>${rule.classType ?? ''}</td>
                            <td>${rule.priority ?? ''}</td>
                            <td>${rule.cve ?? ''}</td>
                            <td>${rule.filename ?? ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
  }

  // 添加 onFilterChange 方法
  onFilterChange(event: any) {
    // 现过辑
    console.log('Filter changed:', event);
    // 这里可以根据过滤条件更新表格数据
    // 例如：
    const filterValue = event.target.value.toLowerCase();
    // 根据需要实现的过滤逻辑
  }

  initForm() {
    this.policyForm = this.fb.group({
        id: [null],
        name: ['', Validators.required],
        description: [''],
        enabled: [false]
    });
    this.selectedRules = [];

    // 清除所有选中状态
    this.availableRules = this.availableRules.map(rule => ({
        ...rule,
        selected: false
    }));

    // 重置全选状态
    if (this._datatable) {
      this._datatable.selectedAll = false;
    }
  }

  // 添加 showMessage 方法
  showMessage(message: string, type: 'success' | 'error' = 'success'): void {
    const toast: any = Swal.mixin({
      toast: true,
      position: 'top',
      showConfirmButton: false,
      timer: 3000,
      customClass: { container: 'toast' },
    });
    toast.fire({
      icon: type,
      title: message,
      padding: '10px 20px',
    });
  }
}
