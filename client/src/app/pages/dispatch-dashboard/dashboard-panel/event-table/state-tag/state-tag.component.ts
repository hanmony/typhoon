import { Component, Input } from '@angular/core';

@Component({
  selector: 'ev-table-state-tag',
  imports: [],
  templateUrl: './state-tag.component.html',
  styleUrl: './state-tag.component.less',
})
export class StateTagComponent {
  @Input() label = '';
  @Input() terminated = false;
  @Input() bgColor: string = '';

  init = false;
  alternating = false;
  timer?: NodeJS.Timeout;

  currentState = {
    label: '',
    terminated: false,
    bgColor: '',
  };

  nextState = {
    label: '',
    terminated: false,
    bgColor: '',
  };

  ngAfterViewInit() {
    setTimeout(() => {
      this.currentState = {
        label: this.label,
        terminated: this.terminated,
        bgColor: this.bgColor,
      };
      this.nextState = {
        ...this.currentState,
      };
      this.init = true;
    });
  }

  ngOnChanges() {
    if (!this.init) return;
    if (
      this.currentState.label !== this.label ||
      this.currentState.terminated !== this.terminated ||
      this.currentState.bgColor !== this.bgColor
    ) {
      this.alternateHandler();
    }
  }

  alternateHandler() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.nextState = {
        label: this.label,
        terminated: this.terminated,
        bgColor: this.bgColor,
      };

      this.alternating = true;
      setTimeout(() => {
        this.currentState = {
          ...this.nextState,
        };
        this.alternating = false;
      }, 2000);
    }, 200);
  }
}
