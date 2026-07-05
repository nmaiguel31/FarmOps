import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  LucideKeyRound,
  LucideMail,
  LucidePencil,
  LucideSave,
  LucideSearch,
  LucideShieldCheck,
  LucideUserPlus,
  LucideUserRound,
  LucideUsers,
  LucideX
} from '@lucide/angular';

import {
  ManagedUser,
  ManagedUserRole,
  ManagedUserStatus,
  UserManagementService
} from '../../services/user-management';
import { ROLE_LABELS } from '../../shared/rbac/roles';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state';
import { ToastService } from '../../shared/toast/toast.service';
import { ConfirmationService } from '../../shared/confirm/confirmation.service';

type RoleOption = {
  value: ManagedUserRole;
  label: string;
  description: string;
};

type UserFormMode = 'create' | 'edit' | 'reset';

@Component({
  selector: 'app-user-management',
  imports: [
    CommonModule,
    FormsModule,
    EmptyStateComponent,
    LucideKeyRound,
    LucideMail,
    LucidePencil,
    LucideSave,
    LucideSearch,
    LucideShieldCheck,
    LucideUserPlus,
    LucideUserRound,
    LucideUsers,
    LucideX
  ],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css'
})
export class UserManagement implements OnInit {
  users: ManagedUser[] = [];
  filteredUsers: ManagedUser[] = [];
  loading = true;
  saving = false;
  loadError = '';
  searchTerm = '';
  roleFilter = 'All';
  statusFilter = 'All';

  modalMode: UserFormMode | null = null;
  selectedUser: ManagedUser | null = null;
  formError = '';

  createForm = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'farm_manager' as ManagedUserRole
  };

  editForm = {
    fullName: '',
    role: 'farm_manager' as ManagedUserRole,
    status: 'active' as ManagedUserStatus
  };

  resetForm = {
    password: '',
    confirmPassword: ''
  };

  readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly roleOptions: RoleOption[] = [
    {
      value: 'administrator',
      label: 'Administrator',
      description: 'Full platform and user management access'
    },
    {
      value: 'farm_manager',
      label: 'Farm Manager',
      description: 'Farm, field, crop, weather, operations and reports access'
    },
    {
      value: 'accountant',
      label: 'Accountant',
      description: 'Financial records and reports access'
    },
    {
      value: 'field_operator',
      label: 'Field Operator',
      description: 'Field operations, weather and operations access'
    }
  ];

  private userService = inject(UserManagementService);
  private toast = inject(ToastService);
  private confirmation = inject(ConfirmationService);

  ngOnInit() {
    this.loadUsers();
  }

  get activeCount() {
    return this.users.filter(user => user.status !== 'suspended').length;
  }

  get suspendedCount() {
    return this.users.filter(user => user.status === 'suspended').length;
  }

  get adminCount() {
    return this.users.filter(user => user.role === 'administrator').length;
  }

  loadUsers() {
    this.loading = true;
    this.loadError = '';

    this.userService.getUsers().pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (users) => {
        this.users = Array.isArray(users) ? users : [];
        this.applyFilters();
      },
      error: (error) => {
        this.users = [];
        this.filteredUsers = [];
        this.loadError = error?.error?.message || 'Unable to load users.';
        this.toast.error('Could not load users', this.loadError);
      }
    });
  }

  applyFilters() {
    const query = this.searchTerm.trim().toLowerCase();

    this.filteredUsers = this.users.filter(user => {
      if (this.roleFilter !== 'All' && user.role !== this.roleFilter) {
        return false;
      }

      if (this.statusFilter !== 'All' && user.status !== this.statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        user.fullName,
        user.email,
        this.getRoleLabel(user.role),
        this.getStatusLabel(user.status)
      ].some(value => String(value || '').toLowerCase().includes(query));
    });
  }

  clearFilters() {
    this.searchTerm = '';
    this.roleFilter = 'All';
    this.statusFilter = 'All';
    this.applyFilters();
  }

  openCreateModal() {
    this.modalMode = 'create';
    this.selectedUser = null;
    this.formError = '';
    this.createForm = {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'farm_manager'
    };
  }

  openEditModal(user: ManagedUser) {
    this.modalMode = 'edit';
    this.selectedUser = user;
    this.formError = '';
    this.editForm = {
      fullName: user.fullName || '',
      role: user.role,
      status: user.status || 'active'
    };
  }

  openResetModal(user: ManagedUser) {
    this.modalMode = 'reset';
    this.selectedUser = user;
    this.formError = '';
    this.resetForm = {
      password: '',
      confirmPassword: ''
    };
  }

  closeModal() {
    if (this.saving) {
      return;
    }

    this.modalMode = null;
    this.selectedUser = null;
    this.formError = '';
  }

  submitCreate() {
    if (this.saving || !this.validateCreateForm()) {
      return;
    }

    this.saving = true;

    this.userService.createUser({
      fullName: this.createForm.fullName.trim(),
      email: this.createForm.email.trim(),
      password: this.createForm.password,
      role: this.createForm.role
    }).subscribe({
      next: (user) => {
        this.saving = false;
        this.closeModal();
        this.toast.success('User created', `${user.fullName} can now sign in to FarmOps.`);
        this.loadUsers();
      },
      error: (error) => {
        this.saving = false;
        this.formError = error?.error?.message || 'Could not create user.';
        this.toast.error('Could not create user', this.formError);
      }
    });
  }

  submitEdit() {
    if (this.saving || !this.selectedUser || !this.validateEditForm()) {
      return;
    }

    this.saving = true;

    this.userService.updateUser(this.selectedUser.id, {
      fullName: this.editForm.fullName.trim(),
      role: this.editForm.role,
      status: this.editForm.status
    }).subscribe({
      next: (updatedUser) => {
        this.saving = false;
        this.closeModal();
        this.toast.success('User updated', `${updatedUser.fullName} was saved.`);
        this.loadUsers();
      },
      error: (error) => {
        this.saving = false;
        this.formError = error?.error?.message || 'Could not update user.';
        this.toast.error('Could not update user', this.formError);
      }
    });
  }

  toggleStatus(user: ManagedUser) {
    const nextStatus: ManagedUserStatus =
      user.status === 'suspended'
        ? 'active'
        : 'suspended';

    const confirmed = this.confirmation.confirmDestructive(
      nextStatus === 'suspended' ? 'Suspend user?' : 'Reactivate user?',
      nextStatus === 'suspended'
        ? `${user.fullName} will no longer be able to sign in until reactivated.`
        : `${user.fullName} will regain access according to their role.`
    );

    if (!confirmed) {
      return;
    }

    this.userService.updateUser(user.id, {
      fullName: user.fullName,
      role: user.role,
      status: nextStatus
    }).subscribe({
      next: (updatedUser) => {
        this.toast.success(
          nextStatus === 'suspended' ? 'User suspended' : 'User activated',
          `${updatedUser.fullName} is now ${this.getStatusLabel(updatedUser.status).toLowerCase()}.`
        );
        this.loadUsers();
      },
      error: (error) => {
        this.toast.error('Could not update status', error?.error?.message || 'Please try again.');
      }
    });
  }

  submitResetPassword() {
    if (this.saving || !this.selectedUser || !this.validateResetForm()) {
      return;
    }

    this.saving = true;

    this.userService.resetPassword(
      this.selectedUser.id,
      this.resetForm.password
    ).subscribe({
      next: (updatedUser) => {
        this.saving = false;
        this.closeModal();
        this.toast.success('Password reset', `A new password was set for ${updatedUser.fullName}.`);
        this.loadUsers();
      },
      error: (error) => {
        this.saving = false;
        this.formError = error?.error?.message || 'Could not reset password.';
        this.toast.error('Could not reset password', this.formError);
      }
    });
  }

  getInitials(user: ManagedUser) {
    const source = user.fullName || user.email || 'FarmOps User';
    const parts = source
      .replace(/@.*$/, '')
      .split(/\s|\.|_/)
      .filter(Boolean);

    return ((parts[0]?.[0] || 'F') + (parts[1]?.[0] || parts[0]?.[1] || 'O')).toUpperCase();
  }

  getRoleLabel(role: ManagedUserRole | string) {
    return ROLE_LABELS[role as ManagedUserRole] || role || 'Unknown role';
  }

  getStatusLabel(status: ManagedUserStatus | string) {
    return status === 'suspended' ? 'Suspended' : 'Active';
  }

  getRoleDescription(roleValue: ManagedUserRole) {
    return this.roleOptions.find(role => role.value === roleValue)?.description || '';
  }

  formatDate(value?: string) {
    if (!value) {
      return 'Not available';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Not available';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  trackByUser(_index: number, user: ManagedUser) {
    return user?.id || user?.email || _index;
  }

  trackByRole(_index: number, role: RoleOption) {
    return role.value;
  }

  trackByValue(_index: number, item: number) {
    return item;
  }

  private validateCreateForm() {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!this.createForm.fullName.trim()) {
      this.formError = 'Full name is required.';
      return false;
    }

    if (!emailPattern.test(this.createForm.email.trim())) {
      this.formError = 'Enter a valid email address.';
      return false;
    }

    if (!this.createForm.password) {
      this.formError = 'Password is required.';
      return false;
    }

    if (this.createForm.password !== this.createForm.confirmPassword) {
      this.formError = 'Passwords must match.';
      return false;
    }

    if (!this.createForm.role) {
      this.formError = 'Role is required.';
      return false;
    }

    this.formError = '';
    return true;
  }

  private validateEditForm() {
    if (!this.editForm.fullName.trim()) {
      this.formError = 'Full name is required.';
      return false;
    }

    if (!this.editForm.role) {
      this.formError = 'Role is required.';
      return false;
    }

    if (!this.editForm.status) {
      this.formError = 'Status is required.';
      return false;
    }

    this.formError = '';
    return true;
  }

  private validateResetForm() {
    if (!this.resetForm.password) {
      this.formError = 'Temporary password is required.';
      return false;
    }

    if (this.resetForm.password !== this.resetForm.confirmPassword) {
      this.formError = 'Passwords must match.';
      return false;
    }

    this.formError = '';
    return true;
  }

}
