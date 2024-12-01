import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import Swal from 'sweetalert2';
import { LocalRule } from './local-rule.interface';

@Component({
    selector: 'app-local-rules',
    templateUrl: './local-rules.component.html',
    styles: [`
        ::ng-deep .modal-content {
            overflow: visible !important;
        }
        ::ng-deep .modal-body {
            overflow: visible !important;
        }
        ::ng-deep .custom-modal {
            overflow: visible !important;
        }
    `]
})
export class LocalRulesComponent implements OnInit {
    @ViewChild('addRuleModal') addRuleModal!: NgxCustomModalComponent;
    params!: FormGroup;
    filteredRulesList: LocalRule[] = [];
    searchTerm = '';
    
    categories = ['Custom', 'System', 'Network', 'Security'];

    localRules: LocalRule[] = [
        {
            id: 1,
            rule_content: 'alert tcp any any -> any any (msg:"Custom Local Rule"; sid:1000001;)',
            created_date: '2024-03-21',
            status: 'Enabled',
            category: 'Custom',
            last_updated: '2024-03-21 10:30:45'
        }
    ];

    constructor(private fb: FormBuilder) {
        this.initForm();
    }

    ngOnInit() {
        this.searchRules();
    }

    initForm() {
        this.params = this.fb.group({
            id: [0],
            rule_content: ['', Validators.required],
            category: ['', Validators.required],
            status: ['Enabled'],
            created_date: [new Date().toISOString().split('T')[0]],
            last_updated: [new Date().toISOString().slice(0, 19).replace('T', ' ')]
        });
    }

    searchRules() {
        this.filteredRulesList = this.localRules.filter((d) => 
            d.rule_content.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            d.category.toLowerCase().includes(this.searchTerm.toLowerCase())
        );
    }

    editRule(rule: LocalRule | null = null) {
        this.addRuleModal.open();
        this.initForm();
        if (rule) {
            this.params.patchValue({
                id: rule.id,
                rule_content: rule.rule_content,
                category: rule.category,
                status: rule.status,
                created_date: rule.created_date,
                last_updated: rule.last_updated
            });
        }
    }

    saveRule() {
        if (this.params.controls['rule_content'].errors) {
            this.showMessage('Rule content is required.', 'error');
            return;
        }
        if (this.params.controls['category'].errors) {
            this.showMessage('Category is required.', 'error');
            return;
        }

        if (this.params.value.id) {
            // update rule
            let rule = this.localRules.find((d) => d.id === this.params.value.id);
            if (rule) {
                rule.rule_content = this.params.value.rule_content;
                rule.category = this.params.value.category;
                rule.status = this.params.value.status;
                rule.last_updated = new Date().toISOString().slice(0, 19).replace('T', ' ');
            }
        } else {
            // add rule
            let maxId = this.localRules.length
                ? this.localRules.reduce((max, rule) => (rule.id > max ? rule.id : max), this.localRules[0].id)
                : 0;

            let rule: LocalRule = {
                id: maxId + 1,
                rule_content: this.params.value.rule_content,
                category: this.params.value.category,
                status: 'Enabled',
                created_date: new Date().toISOString().split('T')[0],
                last_updated: new Date().toISOString().slice(0, 19).replace('T', ' ')
            };
            this.localRules.splice(0, 0, rule);
        }

        this.searchRules();
        this.showMessage('Rule has been saved successfully.');
        this.addRuleModal.close();
    }

    deleteRule(rule: LocalRule) {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            padding: '2em'
        }).then((result) => {
            if (result.value) {
                this.localRules = this.localRules.filter((d) => d.id != rule.id);
                this.searchRules();
                this.showMessage('Rule has been deleted successfully.');
            }
        });
    }

    showMessage(msg = '', type = 'success') {
        const toast: any = Swal.mixin({
            toast: true,
            position: 'top',
            showConfirmButton: false,
            timer: 3000,
            customClass: { container: 'toast' },
        });
        toast.fire({
            icon: type,
            title: msg,
            padding: '10px 20px',
        });
    }

    testRule() {
        if (this.params.controls['rule_content'].errors) {
            this.showMessage('Please input rule content before testing.', 'error');
            return;
        }

        // 显示加载状态
        Swal.fire({
            title: 'Testing Rule',
            text: 'Please wait while we test the rule...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // 模拟测试过程
        setTimeout(() => {
            const ruleContent = this.params.value.rule_content;
            // 这里可以添加实际的规则验证逻辑
            const isValid = ruleContent.includes('alert') && ruleContent.includes('->');

            if (isValid) {
                Swal.fire({
                    icon: 'success',
                    title: 'Rule Test Successful',
                    text: 'The rule syntax is valid and can be used.',
                    confirmButtonText: 'OK'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Rule Test Failed',
                    text: 'The rule syntax is invalid. Please check and try again.',
                    confirmButtonText: 'OK'
                });
            }
        }, 1500);
    }
} 