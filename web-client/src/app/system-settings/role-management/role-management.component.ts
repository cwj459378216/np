import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { slideDownUp, toggleAnimation } from 'src/app/shared/animations';
import Swal from 'sweetalert2';
import { animate, style, transition, trigger } from '@angular/animations';

interface TreeViewItem {
    id: number;
    page: string;
    readWrite: boolean;
    readOnly: boolean;
    level: number;
    showIcon: boolean;
    expanded?: boolean;
    children?: TreeViewItem[];
}

interface Role {
    id: number;
    name: string;
    description: string;
    permissions: any;
    createdAt: string;
}

@Component({
    selector: 'app-role-management',
    animations: [toggleAnimation, slideDownUp,
        trigger('slideDownUp', [
            transition(':enter', [
                style({ height: 0, opacity: 0 }),
                animate('300ms ease-out', style({ height: '*', opacity: 1 }))
            ]),
            transition(':leave', [
                style({ height: '*', opacity: 1 }),
                animate('300ms ease-in', style({ height: 0, opacity: 0 }))
            ])
        ])
    ],
    templateUrl: './role-management.component.html',
    styleUrl: './role-management.component.css'
})
export class RoleManagementComponent implements OnInit {
    @ViewChild('addContactModal') addContactModal!: NgxCustomModalComponent;

    displayType = 'list';
    searchText = '';
    params!: FormGroup;
    roles: Role[] = [];
    filteredRoles: Role[] = [];

    tableData: TreeViewItem[] = [
        {
            id: 1,
            page: 'Dashboard',
            showIcon: false,
            readWrite: false,
            readOnly: false,
            level: 0
        },
        {
            id: 2,
            page: 'Collector',
            showIcon: true,
            readWrite: false,
            readOnly: false,
            level: 0,
            children: [
                {
                    id: 21,
                    page: 'Collector Analyzer',
                    showIcon: false,
                    readWrite: false,
                    readOnly: false,
                    level: 1
                },
                {
                    id: 22,
                    page: 'Filter',
                    showIcon: false,
                    readWrite: false,
                    readOnly: false,
                    level: 1
                }
            ]
        },
        {
            id: 3,
            page: 'Event Alarm',
            showIcon: true,
            readWrite: false,
            readOnly: false,
            level: 0,
            children: [
                {
                    id: 31,
                    page: 'Event',
                    showIcon: false,
                    readWrite: false,
                    readOnly: false,
                    level: 1
                },
                {
                    id: 32,
                    page: 'Alarm Settings',
                    showIcon: false,
                    readWrite: false,
                    readOnly: false,
                    level: 1
                }
            ]
        },
        {
            id: 4,
            page: 'Protocol Analysis',
            showIcon: true,
            readWrite: false,
            readOnly: false,
            level: 0,
            children: [
                {
                    id: 41,
                    page: 'Session Info',
                    showIcon: false,
                    readWrite: false,
                    readOnly: false,
                    level: 1
                },
                {
                    id: 42,
                    page: 'Application Protocols',
                    showIcon: true,
                    readWrite: false,
                    readOnly: false,
                    level: 1,
                    children: [
                        {
                            id: 421,
                            page: 'HTTP',
                            showIcon: false,
                            readWrite: false,
                            readOnly: false,
                            level: 2
                        },
                        {
                            id: 422,
                            page: 'SMTP',
                            showIcon: false,
                            readWrite: false,
                            readOnly: false,
                            level: 2
                        },
                        {
                            id: 423,
                            page: 'FTP',
                            showIcon: false,
                            readWrite: false,
                            readOnly: false,
                            level: 2
                        }
                    ]
                },
                {
                    id: 43,
                    page: 'Settings',
                    showIcon: false,
                    readWrite: false,
                    readOnly: false,
                    level: 1
                }
            ]
        },
        {
            id: 5,
            page: 'Report',
            showIcon: false,
            readWrite: false,
            readOnly: false,
            level: 0
        },
        {
            id: 6,
            page: 'System Settings',
            showIcon: true,
            readWrite: false,
            readOnly: false,
            level: 0,
            children: [
                {
                    id: 61,
                    page: 'User Management',
                    showIcon: false,
                    readWrite: false,
                    readOnly: false,
                    level: 1
                },
                {
                    id: 62,
                    page: 'Role Management',
                    showIcon: false,
                    readWrite: false,
                    readOnly: false,
                    level: 1
                },
                {
                    id: 63,
                    page: 'System Time',
                    showIcon: false,
                    readWrite: false,
                    readOnly: false,
                    level: 1
                },
                {
                    id: 64,
                    page: 'Interface Management',
                    showIcon: false,
                    readWrite: false,
                    readOnly: false,
                    level: 1
                }
            ]
        },
        {
            id: 7,
            page: 'Log',
            showIcon: false,
            readWrite: false,
            readOnly: false,
            level: 0
        }
    ];

    constructor(
        private fb: FormBuilder,
        private http: HttpClient
    ) {
        this.initForm();
    }

    ngOnInit() {
        this.loadRoles();
    }

    initForm() {
        this.params = this.fb.group({
            id: [null],
            name: ['', Validators.required],
            description: ['', Validators.required],
            permissions: ['{}']
        });
    }

    loadRoles() {
        this.http.get<Role[]>(`${environment.apiUrl}/roles`).subscribe(
            (data) => {
                this.roles = data;
                this.searchRoles();
            },
            error => {
                console.error('Error loading roles:', error);
                this.showMessage('Error loading roles', 'error');
            }
        );
    }

    searchRoles() {
        if (!this.searchText.trim()) {
            this.filteredRoles = [...this.roles];
            return;
        }

        const searchStr = this.searchText.toLowerCase();
        this.filteredRoles = this.roles.filter(role =>
            role.name.toLowerCase().includes(searchStr) ||
            role.description.toLowerCase().includes(searchStr)
        );
    }

    editRole(role: Role | null = null) {
        this.addContactModal.open();
        this.initForm();

        if (role) {
            this.params.patchValue({
                id: role.id,
                name: role.name,
                description: role.description,
                permissions: role.permissions
            });

            // 根据权限设置树形结构的选中状态
            const permissions = typeof role.permissions === 'string'
                ? JSON.parse(role.permissions)
                : role.permissions;

            this.setPermissions(this.tableData, permissions);
        } else {
            // 重置树形结构的选中状态
            this.resetPermissions(this.tableData);
        }
    }

    setPermissions(items: TreeViewItem[], permissions: any) {
        items.forEach(item => {
            const permission = permissions[item.page.toLowerCase().replace(/\s+/g, '')];
            if (permission) {
                item.readWrite = permission.readWrite;
                item.readOnly = permission.readOnly;
            }

            if (item.children) {
                this.setPermissions(item.children, permissions);
            }
        });
    }

    resetPermissions(items: TreeViewItem[]) {
        items.forEach(item => {
            item.readWrite = false;
            item.readOnly = false;

            if (item.children) {
                this.resetPermissions(item.children);
            }
        });
    }

    saveRole() {
        if (!this.params.valid) {
            this.showMessage('Please fill all required fields.', 'error');
            return;
        }

        // 收集权限数据
        const permissions = this.collectPermissions(this.tableData);
        const role = {
            ...this.params.value,
            permissions: permissions
        };

        const url = `${environment.apiUrl}/roles${role.id ? `/${role.id}` : ''}`;
        const method = role.id ? 'put' : 'post';

        this.http[method](url, role).subscribe(
            () => {
                this.loadRoles();
                this.showMessage('Role has been saved successfully.');
                this.addContactModal.close();
            },
            error => {
                console.error('Error saving role:', error);
                this.showMessage('Error saving role', 'error');
            }
        );
    }

    collectPermissions(items: TreeViewItem[]): any {
        const permissions: any = {};
        items.forEach(item => {
            const key = item.page.toLowerCase().replace(/\s+/g, '');
            permissions[key] = {
                readWrite: item.readWrite,
                readOnly: item.readOnly
            };

            if (item.children) {
                permissions[key].children = this.collectPermissions(item.children);
            }
        });
        return permissions;
    }

    deleteRole(role: Role) {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            padding: '2em'
        }).then((result) => {
            if (result.value) {
                this.http.delete(`${environment.apiUrl}/roles/${role.id}`).subscribe(
                    () => {
                        this.loadRoles();
                        this.showMessage('Role has been deleted successfully.');
                    },
                    error => {
                        console.error('Error deleting role:', error);
                        this.showMessage('Error deleting role', 'error');
                    }
                );
            }
        });
    }

    updatePermission(node: TreeViewItem, type: 'readWrite' | 'readOnly', event: any) {
        node[type] = event.target.checked;

        // 如果选中了读写权限，自动取消只读权限
        if (type === 'readWrite' && event.target.checked) {
            node.readOnly = false;
        }

        // 如果选中了只读权限，自动取消读写权限
        if (type === 'readOnly' && event.target.checked) {
            node.readWrite = false;
        }

        // 如果有子节点，同步更新子节点的权限
        if (node.children) {
            this.updateChildrenPermissions(node.children, type, event.target.checked);
        }
    }

    updateChildrenPermissions(children: TreeViewItem[], type: 'readWrite' | 'readOnly', checked: boolean) {
        children.forEach(child => {
            child[type] = checked;
            if (type === 'readWrite' && checked) {
                child.readOnly = false;
            }
            if (type === 'readOnly' && checked) {
                child.readWrite = false;
            }
            if (child.children) {
                this.updateChildrenPermissions(child.children, type, checked);
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
