import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
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
    `]
})
export class LocalRulesComponent implements OnInit {
    @ViewChild('addRuleModal') addRuleModal!: NgxCustomModalComponent;
    params!: FormGroup;
    filteredRulesList: LocalRule[] = [];
    searchTerm = '';

    categories = ['Custom', 'System', 'Network', 'Security'];
    localRules: LocalRule[] = [];

    constructor(
        private fb: FormBuilder,
        private localRuleService: LocalRuleService
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        this.loadRules();
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

    testRule(): void {
        if (this.params.controls['rule_content'].errors) {
            this.showMessage('Please input rule content before testing.', 'error');
            return;
        }

        Swal.fire({
            title: 'Testing Rule',
            text: 'Please wait while we test the rule...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        this.localRuleService.testRule(this.params.value.rule_content).subscribe({
            next: (isValid: boolean) => {
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
            },
            error: (error: Error) => {
                Swal.fire({
                    icon: 'error',
                    title: 'Test Failed',
                    text: 'An error occurred while testing the rule.',
                    confirmButtonText: 'OK'
                });
            }
        });
    }
}
