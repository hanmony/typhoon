import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
} from '@angular/core';

@Component({
  standalone: true,
  selector: 'draggable-component',
  templateUrl: './draggable.component.html',
  styleUrl: './draggable.component.less',
})
export class DraggableComponent implements OnInit {
  @Input() initialX: number = 0;
  @Input() initialY: number = 0;
  @Input() limitRight: number = 0;
  @Input() allow: boolean = false;

  @Output() onClick = new EventEmitter();

  private isDragging = false;
  private currentX: number = 0;
  private currentY: number = 0;

  private cacheX: number = 0;
  private cacheY: number = 0;

  positionX = 0;
  positionY = 0;

  constructor(
    private elementRef: ElementRef<HTMLDivElement>,
    private renderer: Renderer2,
  ) {}

  ngOnInit() {
    this.init();
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialX'] || changes['initialY']) {
      this.init();
    }
  }
  init() {
    const dom = this.elementRef.nativeElement.firstChild;
    this.positionX = this.initialX || 0;
    this.positionY = this.initialY || 0;
    this.renderer.setStyle(dom, 'left', this.positionX + 'px');
    this.renderer.setStyle(dom, 'top', this.positionY + 'px');
  }
  setCache() {
    this.cacheX = this.positionX;
    this.cacheY = this.positionY;
  }
  isNotMove() {
    return this.cacheX === this.positionX && this.cacheY === this.positionY;
  }
  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    if (!this.allow) return;
    this.isDragging = true;
    this.setCache();
    this.currentX = event.clientX - this.positionX;
    this.currentY = event.clientY - this.positionY;
    event.preventDefault();
    event.stopPropagation();
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    if (!this.allow) return;
    if (!this.isDragging) return;
    this.isDragging = false;
    if (this.isNotMove()) {
      this.onClick.emit();
    } else {
      this.setCache();
    }
    event.preventDefault();
    event.stopPropagation();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.allow) return;
    if (this.isDragging) {
      const newX = event.clientX - this.currentX;
      const newY = event.clientY - this.currentY;
      const containerWidth = window.innerWidth; // 限定在窗口范围内
      const containerHeight = window.innerHeight; // 限定在窗口范围内
      const dom = this.elementRef.nativeElement.firstChild as HTMLDivElement;
      const elementWidth = dom.offsetWidth;
      const elementHeight = dom.offsetHeight;
      // 限制在指定范围内
      this.positionX = Math.max(
        0,
        Math.min(containerWidth - this.limitRight - elementWidth, newX),
      );
      this.positionY = Math.max(
        0,
        Math.min(containerHeight - elementHeight, newY),
      );

      this.renderer.setStyle(dom, 'left', this.positionX + 'px');
      this.renderer.setStyle(dom, 'top', this.positionY + 'px');
    }
  }
}
