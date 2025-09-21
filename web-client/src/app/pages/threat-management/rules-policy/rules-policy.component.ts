import { Component, ViewChild, AfterViewInit, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { RulesPolicyService } from '../../../services/rules-policy.service';
import { RulesPolicy, Rule } from '../../../models/rules-policy.model';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';

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
  filteredPolicies: RulesPolicy[] = [];

  // 分页相关属性
  currentPage = 1;
  pageSize = 20;
  totalElements = 0;
  totalPages = 0;
  loading = false;
  needsSelectionUpdate = false;

  // 表格列配置 - 将在构造函数中初始化
  ruleColumns: any[] = [];

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


  // 添加 Math 对象引用，用于模板计算
  Math = Math;

  constructor(
    private fb: FormBuilder,
    private rulesPolicyService: RulesPolicyService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService
  ) {
    this.policyForm = this.fb.group({
      id: [''],
      name: [''],
      description: ['']
    });
    
    // 等待翻译服务加载完成后初始化列配置
    this.translate.onLangChange.subscribe(() => {
      this.initializeColumns();
    });
    
    // 立即尝试初始化一次
    setTimeout(() => {
      this.initializeColumns();
    }, 100);
    
    this.loadPolicies();
    this.loadRules();
  }

  ngAfterViewInit() {
    console.log('View initialized');
    // 确保在视图初始化后列配置已经正确设置
    this.initializeColumns();
  }

  // 初始化表格列配置
  private initializeColumns(): void {
    // 使用异步翻译来确保翻译文件已加载
    this.translate.get(['general.ID', 'general.SID', 'general.Protocol', 'general.Message', 'general.ClassType', 'general.Priority', 'general.CVE', 'general.File']).subscribe(translations => {
      this.ruleColumns = [
        { field: 'id', title: translations['general.ID'], hide: true },
        { field: 'sid', title: translations['general.SID'], hide: false },
        { field: 'protocol', title: translations['general.Protocol'], hide: false },
        { field: 'msg', title: translations['general.Message'], hide: false },
        { field: 'classType', title: translations['general.ClassType'], hide: false },
        { field: 'priority', title: translations['general.Priority'], hide: false },
        { field: 'cve', title: translations['general.CVE'], hide: false },
        { field: 'filename', title: translations['general.File'], hide: true }
      ];
      
      // 强制触发变更检测以更新视图
      this.cdr.detectChanges();
    });
  }

  loadPolicies(): void {
    this.rulesPolicyService.getAllPolicies().subscribe(
      (policies: RulesPolicy[]) => {
        this.policies = policies;
        this.searchPolicies(); // 初始化时执行搜索以设置过滤结果
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
    this.loading = true;
    // 后端API使用0作为第一页，前端ng-datatable使用1作为第一页，需要转换
    const backendPage = this.currentPage - 1;
    this.rulesPolicyService.getRulesPaginated(backendPage, this.pageSize, this.searchTerm).subscribe(
      (response: any) => {
        console.log('Loaded paginated rules:', response);

        // 先更新数据
        this.availableRules = response.content;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.loading = false;

        // 立即标记需要应用选择状态
        this.needsSelectionUpdate = true;

        // 强制触发变更检测
        this.cdr.detectChanges();

        // 使用多个时间点尝试应用选择状态
        setTimeout(() => {
          this.applySelectionImmediately();
        }, 100);

        setTimeout(() => {
          this.applySelectionImmediately();
        }, 300);

        setTimeout(() => {
          this.applySelectionImmediately();
        }, 500);
      },
      (error: Error) => {
        console.error('Error loading rules:', error);
        this.loading = false;
      }
    );
  }

  loadAllRules(): void {
    this.rulesPolicyService.getAllRules().subscribe(
      (rules: Rule[]) => {
        console.log('Loaded all rules:', rules);
        this.availableRules = rules;
      },
      (error: Error) => {
        console.error('Error loading all rules:', error);
      }
    );
  }

  editRule(policy?: RulesPolicy) {
    console.log('Edit rule called with policy:', policy);
    this.isInitializing = true;

    // 重置表格状态
    this.resetTableState();

    if (policy) {
      this.policyForm.patchValue(policy);
      // 保存要编辑的策略的规则，但先清空selectedRules，等数据加载完成后再设置
      this.pendingEditPolicy = policy;
    } else {
      this.policyForm.reset();
      this.pendingEditPolicy = undefined;
    }

    this.addRuleModal.open();

    // 重新加载规则数据
    this.loadRules();

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

      // 设置要编辑的策略的规则
      this.selectedRules = policy.rules || [];

      // 过滤出当前页面存在的规则
      const currentPageSelectedRules = this.selectedRules.filter(selected =>
        rows.some((row: Rule) => row.id === selected.id)
      );

      rows.forEach((row: Rule, index: number) => {
        if (currentPageSelectedRules.some(r => r.id === row.id)) {
          console.log('Selecting row:', index, row);
          this._datatable.selectRow(index);
        }
      });

      if (currentPageSelectedRules.length === rows.length && rows.length > 0) {
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
    this.translate.get(['Are you sure?', "You won't be able to revert this!", 'Yes, delete it!', 'Cancel', 'Policy has been deleted successfully', 'Failed to delete policy'])
      .subscribe(translations => {
        Swal.fire({
            title: translations['Are you sure?'],
            text: translations["You won't be able to revert this!"],
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: translations['Yes, delete it!'],
            cancelButtonText: translations['Cancel'],
            padding: '2em',
        }).then((result) => {
            if (result.value) {
                // 用户确认删除
                this.rulesPolicyService.deletePolicy(id).subscribe(
                    () => {
                        console.log('Policy deleted');
                        // 从本地数组中移除被删除的策略
                        this.policies = this.policies.filter(policy => policy.id !== id);
                        // 更新过滤后的策略列表
                        this.searchPolicies();
                        // 显示成功消息
                        this.showMessage(translations['Policy has been deleted successfully']);
                    },
                    (error: Error) => {
                        console.error('Error deleting policy:', error);
                        // 显示错误消息
                        this.showMessage(translations['Failed to delete policy'], 'error');
                    }
                );
            }
        });
      });
  }

  searchRules() {
    // 实现搜索策略的逻辑
    this.searchPolicies();
  }

  searchPolicies() {
    this.filteredPolicies = this.policies.filter((policy) => {
      if (!policy || !policy.name) {
        return false;
      }
      const searchLower = this.searchTerm.toLowerCase();
      return policy.name.toLowerCase().includes(searchLower) ||
             (policy.description && policy.description.toLowerCase().includes(searchLower));
    });
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

    // 如果要启用当前策略，需要先禁用所有其他策略
    if (checked) {
      // 收集所有需要禁用的策略ID（除了当前策略）
      const policiesToDisable = this.policies
        .filter(p => p.id !== id && p.enabled)
        .map(p => p.id);

      if (policiesToDisable.length > 0) {
        // 批量禁用其他策略
        const disablePromises = policiesToDisable.map(policyId =>
          this.rulesPolicyService.updatePolicyStatus(policyId, false).toPromise()
        );

        Promise.all(disablePromises).then(() => {
          // 禁用成功后，更新本地状态
          policiesToDisable.forEach(policyId => {
            const policy = this.policies.find(p => p.id === policyId);
            if (policy) {
              policy.enabled = false;
            }
          });

          // 然后启用当前策略
          this.enableCurrentPolicy(id, policyToUpdate, target);
        }).catch((error) => {
          console.error('Error disabling other policies:', error);
          // 发生错误时恢复复选框状态
          target.checked = false;
          this.translate.get('Failed to update policy status').subscribe(message => {
            this.showMessage(message, 'error');
          });
        });
      } else {
        // 没有其他策略需要禁用，直接启用当前策略
        this.enableCurrentPolicy(id, policyToUpdate, target);
      }
    } else {
      // 禁用当前策略
      this.disableCurrentPolicy(id, policyToUpdate, target);
    }
  }

  private enableCurrentPolicy(id: number, policyToUpdate: any, target: HTMLInputElement): void {
    this.rulesPolicyService.updatePolicyStatus(id, true).subscribe(
      () => {
        console.log('Policy enabled successfully');
        policyToUpdate.enabled = true;
        this.translate.get('Policy "{{name}}" enabled successfully', { name: policyToUpdate.name }).subscribe(message => {
          this.showMessage(message);
        });
      },
      (error: Error) => {
        console.error('Error enabling policy:', error);
        target.checked = false;
        this.translate.get('Failed to enable policy').subscribe(message => {
          this.showMessage(message, 'error');
        });
      }
    );
  }

  private disableCurrentPolicy(id: number, policyToUpdate: any, target: HTMLInputElement): void {
    this.rulesPolicyService.updatePolicyStatus(id, false).subscribe(
      () => {
        console.log('Policy disabled successfully');
        policyToUpdate.enabled = false;
        this.translate.get('Policy "{{name}}" disabled successfully', { name: policyToUpdate.name }).subscribe(message => {
          this.showMessage(message);
        });
      },
      (error: Error) => {
        console.error('Error disabling policy:', error);
        target.checked = true;
        policyToUpdate.enabled = true;
        this.translate.get('Failed to disable policy').subscribe(message => {
          this.showMessage(message, 'error');
        });
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
    console.log('Selected rows changed:', event);

    // 获取当前页面的所有规则ID
    const currentPageRuleIds = this.availableRules.map(rule => rule.id);

    // 移除当前页面的所有选择
    this.selectedRules = this.selectedRules.filter(selected =>
      !currentPageRuleIds.includes(selected.id)
    );

    // 添加当前页面的新选择
    if (event && event.length > 0) {
      this.selectedRules = [...this.selectedRules, ...event];
    }

    console.log('Updated selected rules:', this.selectedRules.length);

    if (this._datatable) {
      const totalRows = this._datatable.rows?.length || this.availableRules.length;
      this._datatable.selectedAll = event && event.length === totalRows;
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
          this.translate.get('Policy has been created successfully').subscribe(message => {
            this.showMessage(message);
          });
          this.addRuleModal.close();
          this.loadPolicies();
          this.selectedRules = [];
          this.initForm();
        },
        (error) => {
          console.error('Error creating policy:', error);
          this.translate.get('Error creating policy').subscribe(message => {
            this.showMessage(message, 'error');
          });
        }
      );
    }
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

  // 重置表格状态
  private resetTableState(): void {
    console.log('Resetting table state...');

    // 重置分页状态
    this.currentPage = 1;
    this.pageSize = 20;
    this.totalElements = 0;
    this.totalPages = 0;

    // 清除搜索条件
    this.searchTerm = '';

    // 重置加载状态
    this.loading = false;

    // 清除选择状态（在编辑模式下会在handleDatatableSelection中重新设置）
    this.selectedRules = [];
    this.needsSelectionUpdate = false;

    // 重置datatable状态
    if (this._datatable) {
      this._datatable.selectedAll = false;
      this._datatable.selectAll(false);
    }

    console.log('Table state reset completed');
  }

  // 立即应用选择状态
  private applySelectionImmediately(): void {
    console.log('Applying selection immediately, selected rules:', this.selectedRules.length);

    if (!this._datatable || !this._datatable.rows || this._datatable.rows.length === 0) {
      console.log('Datatable not ready, will retry...');
      // 如果datatable还没准备好，再等一会儿
      setTimeout(() => {
        this.applySelectionImmediately();
      }, 100);
      return;
    }

    // 清除当前选择
    this._datatable.selectAll(false);

    if (this.selectedRules.length > 0) {
      // 重新应用选择状态
      const rows = this._datatable.rows;
      let appliedCount = 0;

      rows.forEach((row: Rule, index: number) => {
        if (this.selectedRules.some(selected => selected.id === row.id)) {
          console.log('Selecting row:', index, row);
          this._datatable.selectRow(index);
          appliedCount++;
        }
      });

      // 检查是否需要设置全选状态
      const selectedInCurrentPage = rows.filter((row: Rule) =>
        this.selectedRules.some(selected => selected.id === row.id)
      ).length;

      if (selectedInCurrentPage === rows.length && rows.length > 0) {
        console.log('Setting select all to true');
        this._datatable.selectedAll = true;
      }

      console.log('Applied selection count:', appliedCount);
    }

    // 强制更新视图
    this.cdr.detectChanges();

    // 多次尝试直接操作DOM来确保选择状态显示
    setTimeout(() => {
      this.forceUpdateCheckboxes();
    }, 10);

    setTimeout(() => {
      this.forceUpdateCheckboxes();
    }, 50);

    setTimeout(() => {
      this.forceUpdateCheckboxes();
    }, 100);
  }

  // 强制更新复选框状态
  private forceUpdateCheckboxes(): void {
    const datatableElement = document.querySelector('.datatable');
    if (!datatableElement) return;

    const checkboxes = datatableElement.querySelectorAll('input[type="checkbox"]');
    console.log('Found checkboxes:', checkboxes.length);

    if (this.selectedRules.length > 0 && this._datatable && this._datatable.rows) {
      const rows = this._datatable.rows;

      rows.forEach((row: Rule, index: number) => {
        if (this.selectedRules.some(selected => selected.id === row.id)) {
          // 找到对应的复选框并设置为选中状态
          const checkbox = checkboxes[index + 1]; // +1 因为第一个是全选复选框
          if (checkbox && checkbox instanceof HTMLInputElement) {
            checkbox.checked = true;
            console.log('Force checked checkbox for row:', index);
          }
        }
      });

      // 检查全选复选框
      const selectAllCheckbox = checkboxes[0];
      if (selectAllCheckbox && selectAllCheckbox instanceof HTMLInputElement) {
        const selectedInCurrentPage = rows.filter((row: Rule) =>
          this.selectedRules.some(selected => selected.id === row.id)
        ).length;

        if (selectedInCurrentPage === rows.length && rows.length > 0) {
          selectAllCheckbox.checked = true;
          console.log('Force checked select all checkbox');
        } else {
          selectAllCheckbox.checked = false;
        }
      }
    }
  }

  // datatable准备就绪事件
  onDatatableReady(): void {
    console.log('Datatable ready event triggered');
    // 如果数据已经加载完成且有选择状态，立即应用
    if (!this.loading && this.selectedRules.length > 0) {
      setTimeout(() => {
        this.applySelectionImmediately();
      }, 50);
    }
  }

  // 获取当前页面的选中行
  getSelectedRowsForCurrentPage(): Rule[] {
    if (!this.availableRules || this.availableRules.length === 0) {
      return [];
    }

    return this.availableRules.filter(rule =>
      this.selectedRules.some(selected => selected.id === rule.id)
    );
  }

  // 服务器端分页、排序、搜索事件处理
  onServerChange(event: any): void {
    console.log('Server change event:', event);

    if (event.current_page !== undefined) {
      this.currentPage = event.current_page;
    }

    if (event.page_size !== undefined) {
      this.pageSize = event.page_size;
    }

    if (event.search !== undefined) {
      this.searchTerm = event.search;
    }

    // 重新加载数据
    this.loadRules();
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
