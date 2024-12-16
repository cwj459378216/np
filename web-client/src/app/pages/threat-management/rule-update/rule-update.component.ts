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

  viewDetails() {
    // 实现查看详情的逻辑
  }

  searchUpdates() {
    // 实现搜索更新的逻辑
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