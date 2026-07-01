import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  LucideActivity,
  LucideAlertCircle,
  LucideBadgeDollarSign,
  LucideCloudSun,
  LucideFileText,
  LucideLeaf,
  LucideMap,
  LucideSearchX,
  LucideShieldCheck,
  LucideSprout
} from '@lucide/angular';

type EmptyStateTone = 'neutral' | 'success' | 'warning' | 'danger' | 'sky' | 'leaf';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideActivity,
    LucideAlertCircle,
    LucideBadgeDollarSign,
    LucideCloudSun,
    LucideFileText,
    LucideLeaf,
    LucideMap,
    LucideSearchX,
    LucideShieldCheck,
    LucideSprout
  ],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css'
})
export class EmptyStateComponent {
  @Input() icon = 'activity';
  @Input() title = 'No data available';
  @Input() description = '';
  @Input() primaryLabel = '';
  @Input() primaryRoute: string | any[] | null = null;
  @Input() secondaryLabel = '';
  @Input() secondaryRoute: string | any[] | null = null;
  @Input() tone: EmptyStateTone = 'neutral';
  @Input() compact = false;
  @Output() primaryAction = new EventEmitter<void>();
  @Output() secondaryAction = new EventEmitter<void>();

  onPrimaryAction(): void {
    this.primaryAction.emit();
  }

  onSecondaryAction(): void {
    this.secondaryAction.emit();
  }
}
