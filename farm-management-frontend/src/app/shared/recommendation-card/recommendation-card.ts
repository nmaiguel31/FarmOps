import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-recommendation-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recommendation-card.html',
  styleUrl: './recommendation-card.css'
})
export class RecommendationCard {
  @Input() title = 'Recommendation';
  @Input() description = '';
  @Input() source = 'Operations';
  @Input() priority = 'Info';
  @Input() recommendedAction = '';
  @Input() dataSource = 'FarmOps operational data';
  @Input() triggerCondition = 'Matched a rule-based decision condition.';
  @Input() ruleType = 'Rule-based decision engine';
  @Input() compact = false;

  get tone() {
    const normalized = String(this.priority || '').toLowerCase();

    if (normalized.includes('critical') || normalized.includes('high')) {
      return 'high';
    }

    if (normalized.includes('medium') || normalized.includes('moderate') || normalized.includes('warning')) {
      return 'medium';
    }

    if (normalized.includes('low') || normalized.includes('stable') || normalized.includes('normal')) {
      return 'low';
    }

    return 'info';
  }
}
