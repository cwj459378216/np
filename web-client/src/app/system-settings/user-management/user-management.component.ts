import { Component } from '@angular/core';
export interface PermissionItem {
  id: number;
  name: string;
  checked: boolean;
  children?: PermissionItem[];
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css'
})
export class UserManagementComponent {
  permissions: PermissionItem[] = [
    {
      id: 1,
      name: '系统功能',
      checked: false,
      children: [
        { id: 101, name: '多标签页', checked: false },
        { id: 102, name: '标签页', checked: false }
      ]
    },
    {
      id: 2,
      name: '管理',
      checked: false,
      children: [
        { id: 201, name: '用户管理', checked: false },
        { id: 202, name: '角色管理', checked: false }
      ]
    }
  ];

  // 一级菜单的复选框选择/取消选择
  onParentCheckChange(permission: PermissionItem): void {
    if (permission.children) {
      permission.children.forEach(child => (child.checked = permission.checked));
    }
  }

  // 子菜单的复选框选择/取消选择
  onChildCheckChange(permission: PermissionItem): void {
    permission.checked = permission.children?.every(child => child.checked) ?? false;
  }
}
