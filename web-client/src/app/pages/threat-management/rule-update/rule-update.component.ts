import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FileUploadWithPreview } from 'file-upload-with-preview';
import { RuleUpdateService } from '../../../services/rule-update.service';
import { RuleUpdateConfig } from '../../../models/rule-update.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-rule-update',
  templateUrl: './rule-update.component.html'
})
export class RuleUpdateComponent implements OnInit {
  @ViewChild('updateModal') updateModal: any;
  
  searchTerm: string = '';
  updateForm!: FormGroup;
  isAutomaticMode: boolean = true;
  currentConfig: RuleUpdateConfig | null = null;
  updateHistory: RuleUpdateConfig[] = [];
  filteredUpdates: RuleUpdateConfig[] = [];
  
  updateModes = [
    { name: 'Automatic', value: 'automatic' },
    { name: 'Manual', value: 'manual' }
  ];

  constructor(
    private fb: FormBuilder,
    private ruleUpdateService: RuleUpdateService
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.loadCurrentConfig();
    this.loadUpdateHistory();
  }

  initForm() {
    this.updateForm = this.fb.group({
      updateMode: ['automatic'],
      updateUrl: [''],
      updateInterval: [''],
      username: [''],
      password: ['']
    });
  }

  loadCurrentConfig() {
    this.ruleUpdateService.getCurrentConfig().subscribe({
      next: (config: RuleUpdateConfig) => {
        this.currentConfig = config;
        this.updateForm.patchValue({
          updateMode: config.updateMode,
          updateUrl: config.updateUrl,
          updateInterval: config.updateInterval,
          username: config.username,
          password: config.password
        });
        this.isAutomaticMode = config.updateMode === 'automatic';
      },
      error: (error: any) => {
        console.error('Failed to load config:', error);
        this.showMessage('Failed to load configuration', 'error');
      }
    });
  }

  loadUpdateHistory() {
    // 模拟加载更新历史记录，实际项目中应该从服务获取
    this.updateHistory = [
      {
        id: 1,
        updateMode: 'automatic',
        lastUpdateTime: new Date('2024-01-15 10:30:00'),
        totalRules: 1250,
        status: 'completed'
      },
      {
        id: 2,
        updateMode: 'manual',
        lastUpdateTime: new Date('2024-01-10 14:20:00'),
        totalRules: 1180,
        status: 'completed'
      },
      {
        id: 3,
        updateMode: 'automatic',
        lastUpdateTime: new Date('2024-01-05 09:15:00'),
        totalRules: 1150,
        status: 'failed'
      }
    ];
    this.filteredUpdates = [...this.updateHistory];
  }

  updateRules() {
    this.updateModal.open();
  }

  onUpdateModeChange(event: any) {
    this.isAutomaticMode = event.value === 'automatic';
    if (!this.isAutomaticMode) {
      setTimeout(() => {
        new FileUploadWithPreview('ruleFileUpload', {
          images: {
            baseImage: '',
            backgroundImage: '',
          },
          maxFileCount: 1,
          text: {
            chooseFile: 'Choose file...',
            browse: 'Browse',
            selectedCount: 'files selected',
          },
        });
        let previewContainer = document.querySelector('.image-preview') as HTMLElement;
        if (previewContainer) {
          previewContainer.remove();
        }
      }, 100);
    }
  }

  saveUpdateConfig() {
    if (this.updateForm.valid) {
      const configData: RuleUpdateConfig = {
        ...this.updateForm.value,
        id: this.currentConfig?.id
      };

      this.ruleUpdateService.saveConfig(configData).subscribe({
        next: () => {
          this.updateModal.close();
          this.loadCurrentConfig();
          this.showMessage('Configuration saved successfully');
        },
        error: (error: any) => {
          console.error('Failed to save config:', error);
          this.showMessage('Failed to save configuration', 'error');
        }
      });
    }
  }

  executeUpdate() {
    if (this.currentConfig?.id) {
      this.ruleUpdateService.updateRules(this.currentConfig.id, 0).subscribe({
        next: () => {
          this.loadCurrentConfig();
          this.showMessage('Rules updated successfully');
        },
        error: (error: any) => {
          console.error('Failed to execute update:', error);
          this.showMessage('Failed to update rules', 'error');
        }
      });
    }
  }

  viewDetails(update?: RuleUpdateConfig) {
    // 实现查看详情的逻辑
    if (update) {
      console.log('Viewing details for update:', update);
      // 这里可以打开一个详情模态框或导航到详情页面
    }
  }

  rollbackUpdate(update: RuleUpdateConfig) {
    // 实现回滚更新的逻辑
    if (update.id) {
      console.log('Rolling back update:', update.id);
      this.showMessage('Rollback functionality not implemented yet', 'error');
    }
  }

  deleteUpdate(update: RuleUpdateConfig) {
    if (!update.id) return;
    
    // 显示确认对话框
    Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        // 从历史记录中删除
        this.updateHistory = this.updateHistory.filter(u => u.id !== update.id);
        this.searchUpdates(); // 重新应用搜索过滤
        
        this.showMessage('Update record deleted successfully');
        
        // 这里应该调用服务来删除服务器端的记录
        // this.ruleUpdateService.deleteUpdate(update.id).subscribe({
        //   next: () => {
        //     this.loadUpdateHistory();
        //     this.showMessage('Update record deleted successfully');
        //   },
        //   error: (error) => {
        //     console.error('Failed to delete update:', error);
        //     this.showMessage('Failed to delete update record', 'error');
        //   }
        // });
      }
    });
  }

  searchUpdates() {
    if (!this.searchTerm.trim()) {
      this.filteredUpdates = [...this.updateHistory];
    } else {
      const searchLower = this.searchTerm.toLowerCase();
      this.filteredUpdates = this.updateHistory.filter(update => 
        update.updateMode?.toLowerCase().includes(searchLower) ||
        update.status?.toLowerCase().includes(searchLower) ||
        update.totalRules?.toString().includes(searchLower)
      );
    }
  }

  showMessage(message: string, type: 'success' | 'error' = 'success'): void {
    const toast: any = Swal.mixin({
      toast: true,
      position: 'top',
      showConfirmButton: false,
      timer: 3000,
      customClass: { container: 'toast' }
    });
    toast.fire({
      icon: type,
      title: message,
      padding: '10px 20px'
    });
  }
} 