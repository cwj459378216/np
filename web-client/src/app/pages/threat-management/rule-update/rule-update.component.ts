import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { FileUploadWithPreview } from 'file-upload-with-preview';

@Component({
  selector: 'app-rule-update',
  templateUrl: './rule-update.component.html'
})
export class RuleUpdateComponent implements OnInit {
  @ViewChild('updateModal') updateModal: any;
  
  searchTerm: string = '';
  updateForm: FormGroup;
  isAutomaticMode: boolean = true;
  
  updateModes = [
    { name: 'Automatic', value: 'automatic' },
    { name: 'Manual', value: 'manual' }
  ];

  constructor(private fb: FormBuilder) {
    this.updateForm = this.fb.group({
      updateMode: ['automatic'],
      updateUrl: [''],
      updateInterval: [''],
      username: [''],
      password: [''],
    });
  }

  ngOnInit() {
    // 不需要在这里初始化
  }

  updateRules() {
    this.updateModal.open();
  }

  onUpdateModeChange(event: any) {
    this.isAutomaticMode = event.value === 'automatic';
    if (!this.isAutomaticMode) {
      setTimeout(() => {
        // 初始化文件上传组件
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
        // 移除预览容器
        let previewContainer = document.querySelector('.image-preview') as HTMLElement;
        if (previewContainer) {
          previewContainer.remove();
        }
      }, 100);
    }
  }

  saveUpdateConfig() {
    if (this.updateForm.valid) {
      // 处理保存配置的逻辑
      console.log(this.updateForm.value);
      this.updateModal.close();
    }
  }

  viewDetails() {
    // 实现查看详情的逻辑
  }

  searchUpdates() {
    // 实现搜索更新的逻辑
  }
} 