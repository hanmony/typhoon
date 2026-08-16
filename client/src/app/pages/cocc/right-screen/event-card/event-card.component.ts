import { Component, input } from '@angular/core';

export interface CardItem {
  type: string;
  line: string;
  startStation: string;
  endStation: string;
  state: string;
}

@Component({
  selector: 'cocc-event-card',
  imports: [],
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.less',
})
export class EventCardComponent {
  data = input.required<CardItem>();
}
