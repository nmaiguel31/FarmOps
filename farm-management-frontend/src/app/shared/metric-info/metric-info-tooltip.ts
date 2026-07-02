import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { METRIC_DEFINITIONS, MetricDefinition } from './metric-definitions';

@Component({
  selector: 'app-metric-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './metric-info-tooltip.html',
  styleUrl: './metric-info-tooltip.css'
})
export class MetricInfoTooltip {
  @Input() metric = '';
  @Input() align: 'start' | 'center' | 'end' = 'center';

  open = false;

  get definition(): MetricDefinition | null {
    return METRIC_DEFINITIONS[this.metric] || null;
  }

  toggle(event: Event) {
    event.stopPropagation();
    this.open = !this.open;
  }

  close() {
    this.open = false;
  }
}
