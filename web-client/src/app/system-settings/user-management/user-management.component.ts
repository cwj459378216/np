import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
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
        private http: HttpClient
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
                this.showMessage('Error loading users', 'error');
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
                this.showMessage('Error loading roles', 'error');
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
            this.showMessage('Please fill all required fields.', 'error');
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
                this.showMessage('User has been saved successfully.');
                this.addContactModal.close();
            },
            error => {
                console.error('Error saving user:', error);
                this.showMessage('Error saving user', 'error');
            }
        );
    }

    deleteUser(user: User) {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            padding: '2em'
        }).then((result) => {
            if (result.value) {
                this.http.delete(`${environment.apiUrl}/users/${user.id}`).subscribe(
                    () => {
                        this.loadUsers();
                        this.showMessage('User has been deleted successfully.');
                    },
                    error => {
                        console.error('Error deleting user:', error);
                        this.showMessage('Error deleting user', 'error');
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
                this.showMessage(nextStatus ? 'User enabled successfully.' : 'User disabled successfully.');
            },
            error: () => {
                user.status = prevStatus; // rollback
                this.showMessage('Failed to update user status', 'error');
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
