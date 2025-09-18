import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';
import { LocalRule } from './local-rule.interface';
import { LocalRuleService } from '../../../services/local-rule.service';

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
        .rule-content-cell {
            max-width: 300px;
        }
        .rule-content-text {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            cursor: help;
        }
    `]
})
export class LocalRulesComponent implements OnInit {
    @ViewChild('addRuleModal') addRuleModal!: NgxCustomModalComponent;
    params!: FormGroup;
    filteredRulesList: LocalRule[] = [];
    searchTerm = '';

    categories = ['Custom', 'System', 'Network', 'Security'];
    translatedCategories: {value: string, label: string}[] = [];
    localRules: LocalRule[] = [];

    constructor(
        private fb: FormBuilder,
        private localRuleService: LocalRuleService,
        private translate: TranslateService
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        this.loadRules();
        this.loadTranslatedCategories();
    }

    loadTranslatedCategories() {
        this.translate.get(this.categories).subscribe(translations => {
            this.translatedCategories = this.categories.map(category => ({
                value: category,
                label: translations[category]
            }));
        });

        // 监听语言变化
        this.translate.onLangChange.subscribe(() => {
            this.translate.get(this.categories).subscribe(translations => {
                this.translatedCategories = this.categories.map(category => ({
                    value: category,
                    label: translations[category]
                }));
            });
        });
    }

    initForm() {
        this.params = this.fb.group({
            id: [0],
            rule_content: ['', Validators.required],
            category: ['', Validators.required],
            status: ['Enabled'],
            created_date: [new Date().toISOString().slice(0, 19).replace('T', ' ')],
            last_updated: [new Date().toISOString().slice(0, 19).replace('T', ' ')]
        });
    }

    loadRules(): void {
        this.localRules = [];
        this.localRuleService.getAllRules().subscribe({
            next: (rules: LocalRule[]) => {
                this.localRules = rules || [];
                this.searchRules();
            },
            error: (error: Error) => {
                console.error('Failed to load rules:', error);
                this.showMessage('Failed to load rules', 'error');
                this.localRules = [];
                this.searchRules();
            }
        });
    }

    searchRules() {
        if (!this.localRules) {
            this.filteredRulesList = [];
            return;
        }

        this.filteredRulesList = this.localRules.filter((rule) => {
            if (!rule) return false;

            const ruleContent = (rule.rule_content || '').toLowerCase();
            const category = (rule.category || '').toLowerCase();
            const searchTerm = (this.searchTerm || '').toLowerCase();

            return ruleContent.includes(searchTerm) ||
                   category.includes(searchTerm);
        });
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

    saveRule(): void {
        if (this.params.controls['rule_content'].errors || this.params.controls['category'].errors) {
            this.showMessage('Please fill in all required fields.', 'error');
            return;
        }

        const rule = this.params.value;
        // must pass Test Rule before saving
        this.localRuleService.testRule(rule.rule_content).subscribe({
            next: (result: { success: boolean; message?: string }) => {
                if (!result?.success) {
                    this.translate.get(['Rule Test Failed', 'The rule syntax is invalid. Please check and try again.', 'OK']).subscribe(translations => {
                        Swal.fire({
                            icon: 'error',
                            title: translations['Rule Test Failed'],
                            text: result?.message || translations['The rule syntax is invalid. Please check and try again.'],
                            confirmButtonText: translations['OK']
                        });
                    });
                    return;
                }

                if (rule.id) {
                    this.localRuleService.updateRule(rule.id, rule).subscribe({
                        next: (updatedRule: LocalRule) => {
                            const index = this.localRules.findIndex(r => r.id === updatedRule.id);
                            if (index !== -1) {
                                this.localRules[index] = updatedRule;
                            }
                            this.searchRules();
                            this.showMessage('Rule has been updated successfully.');
                            this.addRuleModal.close();
                        },
                        error: (error: Error) => {
                            this.showMessage('Failed to update rule', 'error');
                        }
                    });
                } else {
                    this.localRuleService.createRule(rule).subscribe({
                        next: (newRule: LocalRule) => {
                            this.localRules.unshift(newRule);
                            this.searchRules();
                            this.showMessage('Rule has been created successfully.');
                            this.addRuleModal.close();
                        },
                        error: (error: Error) => {
                            this.showMessage('Failed to create rule', 'error');
                        }
                    });
                }
            },
            error: () => {
                this.showMessage('Failed to test rule', 'error');
            }
        });
    }

    deleteRule(rule: LocalRule) {
        this.translate.get(['Are you sure?', 'You won\'t be able to revert this!', 'Yes, delete it!']).subscribe(translations => {
            Swal.fire({
                title: translations['Are you sure?'],
                text: translations['You won\'t be able to revert this!'],
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: translations['Yes, delete it!'],
                padding: '2em'
            }).then((result) => {
                if (result.value) {
                    this.localRuleService.deleteRule(rule.id).subscribe(
                        () => {
                            this.localRules = this.localRules.filter(r => r.id !== rule.id);
                            this.searchRules();
                            this.showMessage('Rule has been deleted successfully.');
                        },
                        error => {
                            this.showMessage('Failed to delete rule', 'error');
                        }
                    );
                }
            });
        });
    }

    toggleRuleStatus(rule: LocalRule, event: Event) {
        const input = event.target as HTMLInputElement;
        const nextStatus: 'Enabled' | 'Disabled' = input.checked ? 'Enabled' : 'Disabled';
        const prevStatus = rule.status as 'Enabled' | 'Disabled';

        // optimistic UI
        rule.status = nextStatus;

        this.localRuleService.updateRule(rule.id, { ...rule, status: nextStatus }).subscribe({
            next: (updatedRule: LocalRule) => {
                const index = this.localRules.findIndex(r => r.id === updatedRule.id);
                if (index !== -1) this.localRules[index] = updatedRule;
                this.searchRules();
                this.showMessage(
                    nextStatus === 'Enabled' ? 'Rule enabled successfully.' : 'Rule disabled successfully.'
                );
            },
            error: () => {
                // rollback
                rule.status = prevStatus;
                this.showMessage('Failed to update rule status', 'error');
            }
        });
    }

    showMessage(msg = '', type = 'success') {
        this.translate.get(msg).subscribe(translatedMessage => {
            const toast: any = Swal.mixin({
                toast: true,
                position: 'top',
                showConfirmButton: false,
                timer: 3000,
                customClass: { container: 'toast' },
            });
            toast.fire({
                icon: type,
                title: translatedMessage,
                padding: '10px 20px',
            });
        });
    }

    testRule(): void {
        if (this.params.controls['rule_content'].errors) {
            this.showMessage('Please input rule content before testing.', 'error');
            return;
        }

        this.translate.get(['Testing Rule', 'Please wait while we test the rule...', 'Rule Test Successful', 'The rule syntax is valid and can be used.', 'Rule Test Failed', 'The rule syntax is invalid. Please check and try again.', 'Test Failed', 'An error occurred while testing the rule.', 'OK']).subscribe(translations => {
            Swal.fire({
                title: translations['Testing Rule'],
                text: translations['Please wait while we test the rule...'],
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            this.localRuleService.testRule(this.params.value.rule_content).subscribe({
                next: (result: { success: boolean; message?: string }) => {
                    if (result?.success) {
                        Swal.fire({
                            icon: 'success',
                            title: translations['Rule Test Successful'],
                            text: translations['The rule syntax is valid and can be used.'],
                            confirmButtonText: translations['OK']
                        });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: translations['Rule Test Failed'],
                            text: result?.message || translations['The rule syntax is invalid. Please check and try again.'],
                            confirmButtonText: translations['OK']
                        });
                    }
                },
                error: (error: Error) => {
                    Swal.fire({
                        icon: 'error',
                        title: translations['Test Failed'],
                        text: (error as any)?.error?.message || translations['An error occurred while testing the rule.'],
                        confirmButtonText: translations['OK']
                    });
                }
            });
        });
    }
}
