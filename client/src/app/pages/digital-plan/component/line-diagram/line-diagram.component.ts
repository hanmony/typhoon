import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { IMAGES } from './lineSvg/images';

@Component({
  selector: 'app-line-diagram',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './line-diagram.component.html',
  styleUrls: ['./line-diagram.component.less'],
})
export class LineDiagramComponent implements OnInit {
  hideTitle = environment.hideTitle;
  // 线路图选项
  diagrams = [
    { label: '洞口示意图', value: 'caveEntrance' },
    { label: '互联互通示意图', value: 'interconnection' },
    { label: '绿化示意图', value: 'greening' },
    { label: '防汛抢修队示意图', value: 'floodControl' },
    { label: '户外广告示意图', value: 'advertisement' },
    { label: '积水区段示意图', value: 'accumulatedWater' },
    { label: '下沉式车站示意图', value: 'sink' },
    { label: '区间风井示意图', value: 'interval' },
  ];

  // 选中的线路图
  selectedDiagram: string = '';
  // 选中的SVG图像
  selectedSvg: string = '';
  // 缩放比例
  scale: number = 1;
  // 缩放步长
  zoomStep: number = 0.1;
  // 最小缩放比例
  minScale: number = 0.1;
  // 最大缩放比例
  maxScale: number = 3;
  // 下拉框是否打开
  isDropdownOpen: boolean = false;
  // 是否正在拖动
  isDragging: boolean = false;
  // 拖动起始位置
  startX: number = 0;
  startY: number = 0;
  // 当前偏移位置
  currentX: number = 0;
  currentY: number = 0;

  ngOnInit() {
    // 初始化时添加点击外部关闭的监听
    // 默认选择第一个线路图
    if (this.diagrams.length > 0 && !this.selectedDiagram) {
      this.selectDiagram(this.diagrams[0].value);
    }
  }

  // 监听点击事件，点击外部关闭下拉框
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // 点击外部时关闭下拉框
    this.isDropdownOpen = false;
  }

  // 当线路图选择变化时
  onDiagramChange() {
    if (this.selectedDiagram) {
      // 使用 setTimeout 异步加载图像，避免阻塞 UI
      setTimeout(() => {
        this.selectedSvg = IMAGES[this.selectedDiagram as keyof typeof IMAGES];
        // 重置缩放比例
        this.scale = 1;
      }, 0);
    } else {
      this.selectedSvg = '';
    }
  }

  // 鼠标滚轮
  onWheel(event: WheelEvent) {
    event.preventDefault(); // 阻止默认滚动行为

    // 根据滚轮方向计算缩放方向
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = this.scale * delta;

    // 限制缩放范围
    this.scale = Math.max(0.5, Math.min(newScale, 3));
  }

  // 鼠标按下事件
  onMouseDown(event: MouseEvent) {
    this.isDragging = true;
    this.startX = event.clientX;
    this.startY = event.clientY;

    // 添加文档级别的鼠标移动和释放事件监听器
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  // 鼠标移动事件处理
  private handleMouseMove = (event: MouseEvent) => {
    if (!this.isDragging) return;

    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;

    this.currentX += dx;
    this.currentY += dy;

    this.startX = event.clientX;
    this.startY = event.clientY;
  };

  // 鼠标释放事件处理
  private handleMouseUp = () => {
    this.isDragging = false;
    // 移除文档级别的事件监听器
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  };

  // 鼠标移动事件（保持兼容性，但实际处理已移至文档级别）
  onMouseMove(event: MouseEvent) {
    // 事件处理已移至文档级别的 handleMouseMove
  }

  // 鼠标释放事件（保持兼容性，但实际处理已移至文档级别）
  onMouseUp() {
    // 事件处理已移至文档级别的 handleMouseUp
  }

  // 鼠标离开事件
  onMouseLeave() {
    if (this.isDragging) {
      this.isDragging = false;
      // 移除文档级别的事件监听器
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('mouseup', this.handleMouseUp);
    }
  }

  // 切换下拉框显示/隐藏
  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  // 选择线路图
  selectDiagram(value: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.selectedDiagram = value;
    this.isDropdownOpen = false;
    this.onDiagramChange();
  }

  // 获取选中的线路图标签
  getSelectedDiagramLabel(): string {
    const diagram = this.diagrams.find((d) => d.value === this.selectedDiagram);
    return diagram ? diagram.label : '';
  }

  // 切换到下一个线路图
  nextDiagram(): void {
    if (this.diagrams.length === 0) return;

    const currentIndex = this.diagrams.findIndex(
      (d) => d.value === this.selectedDiagram,
    );
    const nextIndex = (currentIndex + 1) % this.diagrams.length;
    this.selectDiagram(this.diagrams[nextIndex].value);
  }

  // 切换到上一个线路图
  prevDiagram(): void {
    if (this.diagrams.length === 0) return;

    const currentIndex = this.diagrams.findIndex(
      (d) => d.value === this.selectedDiagram,
    );
    const prevIndex =
      currentIndex === 0 ? this.diagrams.length - 1 : currentIndex - 1;
    this.selectDiagram(this.diagrams[prevIndex].value);
  }
}
