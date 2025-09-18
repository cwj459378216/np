import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';

interface User {
    id: number;
    username: string;
    email: string;
    password?: string;
    role: {
        id: number;
        name: string;
    };
    description: string;
    status: boolean;
    createdAt: string;
}

@Component({
    selector: 'app-user-management',
    templateUrl: './user-management.component.html',
    styleUrl: './user-management.component.css'
})
export class UserManagementComponent implements OnInit {
    @ViewChild('addContactModal') addContactModal!: NgxCustomModalComponent;

    displayType = 'list';
    searchText = '';
    params!: FormGroup;
    users: User[] = [];
    filteredUsers: User[] = [];
    roles: any[] = [];

    constructor(
        private fb: FormBuilder,
        private http: HttpClient,
        private translate: TranslateService
    ) {
        this.initForm();
    }

    ngOnInit() {
        this.loadUsers();
        this.loadRoles();
    }

    initForm() {
        this.params = this.fb.group({
            id: [null],
            username: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            password: [''],
            roleId: ['', Validators.required],
            description: [''],
            status: [true]
        });
    }

    loadUsers() {
        this.http.get<User[]>(`${environment.apiUrl}/users`).subscribe(
            (data) => {
                this.users = data;
                this.searchUsers();
            },
            (error) => {
                console.error('Error loading users:', error);
                this.showMessage(this.translate.instant('users.errorLoadingUsers'), 'error');
            }
        );
    }

    loadRoles() {
        this.http.get<any[]>(`${environment.apiUrl}/roles`).subscribe(
            (data) => {
                this.roles = data;
            },
            (error) => {
                console.error('Error loading roles:', error);
                this.showMessage(this.translate.instant('users.errorLoadingRoles'), 'error');
            }
        );
    }

    searchUsers() {
        if (!this.searchText) {
            this.filteredUsers = [...this.users];
        } else {
            const searchTerm = this.searchText.toLowerCase();
            this.filteredUsers = this.users.filter(user =>
                user.username.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm) ||
                user.description?.toLowerCase().includes(searchTerm)
            );
        }
    }

    editUser(user: User | null = null) {
        this.addContactModal.open();
        this.initForm();

        if (user) {
            this.params.patchValue({
                id: user.id,
                username: user.username,
                email: user.email,
                roleId: user.role.id,
                description: user.description,
                status: user.status
            });
        }
    }

    saveUser() {
        if (!this.params.valid) {
            this.showMessage(this.translate.instant('users.pleaseAllRequiredFields'), 'error');
            return;
        }

        const user = {
            ...this.params.value,
            role: { id: this.params.value.roleId }
        };
        delete user.roleId;

        const url = `${environment.apiUrl}/users${user.id ? `/${user.id}` : ''}`;
        const method = user.id ? 'put' : 'post';

        if (user.id && !user.password) {
            delete user.password;
        }

        this.http[method](url, user).subscribe(
            () => {
                this.loadUsers();
                this.showMessage(this.translate.instant('users.userSavedSuccessfully'));
                this.addContactModal.close();
            },
            error => {
                console.error('Error saving user:', error);
                this.showMessage(this.translate.instant('users.errorSavingUser'), 'error');
            }
        );
    }

    deleteUser(user: User) {
        Swal.fire({
            title: this.translate.instant('users.areYouSure'),
            text: this.translate.instant('users.deleteConfirmText'),
            icon: 'warning',
            showCancelButton: true,
            cancelButtonText: this.translate.instant('general.cancel'),
            confirmButtonText: this.translate.instant('users.yesDeleteIt'),
            padding: '2em'
        }).then((result) => {
            if (result.value) {
                this.http.delete(`${environment.apiUrl}/users/${user.id}`).subscribe(
                    () => {
                        this.loadUsers();
                        this.showMessage(this.translate.instant('users.userDeletedSuccessfully'));
                    },
                    error => {
                        console.error('Error deleting user:', error);
                        this.showMessage(this.translate.instant('users.errorDeletingUser'), 'error');
                    }
                );
            }
        });
    }

    toggleUserStatus(user: User, event: Event) {
        const input = event.target as HTMLInputElement;
        const nextStatus = input.checked;
        const prevStatus = user.status;
        user.status = nextStatus; // optimistic
        const payload: any = { ...user, role: { id: user.role.id }, status: nextStatus };
        if (!payload.password) delete payload.password;
        this.http.put(`${environment.apiUrl}/users/${user.id}`, payload).subscribe({
            next: () => {
                this.showMessage(nextStatus ? this.translate.instant('users.userEnabledSuccessfully') : this.translate.instant('users.userDisabledSuccessfully'));
            },
            error: () => {
                user.status = prevStatus; // rollback
                this.showMessage(this.translate.instant('users.failedUpdateUserStatus'), 'error');
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
}
