import {
  Component,
  ElementRef,
  Input,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'compare-evaluation-text',
  imports: [],
  templateUrl: './evaluation-text.component.html',
  styleUrl: './evaluation-text.component.less',
})
export class EvaluationTextComponent {
  @Input() text = '';
  collapsed = true;
  shouldCollapse = false;
  height = 22;
  @ViewChild('initialContainer') initialContainer!: ElementRef<HTMLDivElement>;

  toggleCollapse() {
    this.collapsed = !this.collapsed;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['text']) {
      this.shouldCollapse = false;
      setTimeout(() => {
        this.checkAndModifyCollapseNeeded();
      });
    }
  }
  checkAndModifyCollapseNeeded() {
    const dom = this.initialContainer.nativeElement;
    if (!dom) return;
    if (dom.scrollHeight > dom.clientHeight) {
      this.shouldCollapse = true;
      this.collapsed = true;
      this.height = dom.scrollHeight;
    } else {
      this.shouldCollapse = false;
      this.collapsed = false;
      this.height = 22;
    }
  }
}
