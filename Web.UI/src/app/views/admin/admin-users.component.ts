import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { AdminService, UserDto } from 'app/core/services/admin.service';
import { appAnimations } from 'app/shared/animations/animations';

@Component({
    selector: 'app-admin-users',
    standalone: true,
    imports: [
        CommonModule,
        MatTableModule,
        MatSlideToggleModule,
        MatIconModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatChipsModule
    ],
    animations: appAnimations,
    template: `
        <div class="p-6" [@animate]="{value:'*',params:{y:'20px',opacity:'0',delay:'100ms', duration: '300ms'}}">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h1 class="text-2xl font-semibold">User Management</h1>
                    <p class="text-secondary text-sm mt-1">Manage registered users and their access.</p>
                </div>
                <button mat-stroked-button (click)="loadUsers()" [disabled]="loading">
                    <mat-icon class="mr-1">refresh</mat-icon>
                    Refresh
                </button>
            </div>

            <div *ngIf="loading" class="flex justify-center py-12">
                <mat-spinner diameter="40"></mat-spinner>
            </div>

            <div *ngIf="error" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                {{ error }}
            </div>

            <div *ngIf="!loading && users.length > 0" class="border rounded-xl overflow-hidden bg-card shadow-sm">
                <table mat-table [dataSource]="users" class="w-full">
                    <!-- Email -->
                    <ng-container matColumnDef="email">
                        <th mat-header-cell *matHeaderCellDef class="!text-sm !font-semibold">Email</th>
                        <td mat-cell *matCellDef="let user" class="!text-sm">{{ user.email }}</td>
                    </ng-container>

                    <!-- Display Name -->
                    <ng-container matColumnDef="displayName">
                        <th mat-header-cell *matHeaderCellDef class="!text-sm !font-semibold">Display Name</th>
                        <td mat-cell *matCellDef="let user" class="!text-sm">{{ user.displayName }}</td>
                    </ng-container>

                    <!-- Provider -->
                    <ng-container matColumnDef="authProvider">
                        <th mat-header-cell *matHeaderCellDef class="!text-sm !font-semibold">Provider</th>
                        <td mat-cell *matCellDef="let user" class="!text-sm">
                            <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                                [ngClass]="{
                                    'bg-red-100 text-red-700': user.authProvider === 'google',
                                    'bg-blue-100 text-blue-700': user.authProvider === 'azure',
                                    'bg-gray-100 text-gray-700': user.authProvider === 'local'
                                }">
                                {{ user.authProvider }}
                            </span>
                        </td>
                    </ng-container>

                    <!-- Created -->
                    <ng-container matColumnDef="createdAt">
                        <th mat-header-cell *matHeaderCellDef class="!text-sm !font-semibold">Created</th>
                        <td mat-cell *matCellDef="let user" class="!text-sm text-secondary">
                            {{ user.createdAt | date:'mediumDate' }}
                        </td>
                    </ng-container>

                    <!-- Last Login -->
                    <ng-container matColumnDef="lastLoginAt">
                        <th mat-header-cell *matHeaderCellDef class="!text-sm !font-semibold">Last Login</th>
                        <td mat-cell *matCellDef="let user" class="!text-sm text-secondary">
                            {{ user.lastLoginAt | date:'medium' }}
                        </td>
                    </ng-container>

                    <!-- Active -->
                    <ng-container matColumnDef="isActive">
                        <th mat-header-cell *matHeaderCellDef class="!text-sm !font-semibold">Active</th>
                        <td mat-cell *matCellDef="let user">
                            <mat-slide-toggle
                                [checked]="user.isActive"
                                (change)="toggleActive(user)"
                                color="primary">
                            </mat-slide-toggle>
                        </td>
                    </ng-container>

                    <!-- Approved -->
                    <ng-container matColumnDef="isApproved">
                        <th mat-header-cell *matHeaderCellDef class="!text-sm !font-semibold">Approved</th>
                        <td mat-cell *matCellDef="let user">
                            <mat-slide-toggle
                                [checked]="user.isApproved"
                                (change)="toggleApproved(user)"
                                color="primary">
                            </mat-slide-toggle>
                        </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover:bg-hover"></tr>
                </table>
            </div>

            <div *ngIf="!loading && users.length === 0 && !error" class="text-center py-12 text-secondary">
                <mat-icon class="!text-[48px] !w-12 !h-12 mb-4">people_outline</mat-icon>
                <p>No registered users yet.</p>
            </div>
        </div>
    `
})
export class AdminUsersComponent implements OnInit, OnDestroy {
    users: UserDto[] = [];
    loading = false;
    error = '';
    displayedColumns = ['email', 'displayName', 'authProvider', 'createdAt', 'lastLoginAt', 'isActive', 'isApproved'];

    private destroy$ = new Subject<void>();

    constructor(private adminService: AdminService) {}

    ngOnInit() {
        this.loadUsers();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadUsers() {
        this.loading = true;
        this.error = '';
        this.adminService.listUsers()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (users) => {
                    this.users = users;
                    this.loading = false;
                },
                error: (err) => {
                    this.error = 'Failed to load users.';
                    this.loading = false;
                }
            });
    }

    toggleActive(user: UserDto) {
        const newActive = !user.isActive;
        this.adminService.updateUser(user.partitionKey, user.rowKey, { isActive: newActive, isApproved: user.isApproved })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => { user.isActive = newActive; },
                error: () => { this.error = 'Failed to update user.'; }
            });
    }

    toggleApproved(user: UserDto) {
        const newApproved = !user.isApproved;
        this.adminService.updateUser(user.partitionKey, user.rowKey, { isActive: user.isActive, isApproved: newApproved })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => { user.isApproved = newApproved; },
                error: () => { this.error = 'Failed to update user.'; }
            });
    }
}
