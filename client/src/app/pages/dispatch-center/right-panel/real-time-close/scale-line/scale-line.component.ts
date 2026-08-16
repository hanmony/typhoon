import { Component, computed, effect, input } from '@angular/core';

const interpolateColor = (
  startColor: string,
  endColor: string,
  steps: number,
) => {
  // 将颜色转换为RGB格式
  function colorToRgb(color: string) {
    let rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    return rgb
      ? {
          r: parseInt(rgb[1], 16),
          g: parseInt(rgb[2], 16),
          b: parseInt(rgb[3], 16),
        }
      : null;
  }

  // 将RGB颜色转换为十六进制字符串
  function rgbToHex(r, g, b) {
    return (
      '#' +
      ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
    );
  }

  // 计算两个颜色之间的差值
  let startRGB = colorToRgb(startColor)!;
  let endRGB = colorToRgb(endColor)!;
  let diffR = endRGB.r - startRGB.r;
  let diffG = endRGB.g - startRGB.g;
  let diffB = endRGB.b - startRGB.b;

  // 生成渐变色数组
  let colors: string[] = [];
  for (let i = 0; i <= steps; i++) {
    let r = startRGB.r + (diffR * i) / steps;
    let g = startRGB.g + (diffG * i) / steps;
    let b = startRGB.b + (diffB * i) / steps;
    colors.push(rgbToHex(Math.round(r), Math.round(g), Math.round(b)));
  }

  return colors;
};

@Component({
  selector: 'ds-scale-line',
  imports: [],
  templateUrl: './scale-line.component.html',
  styleUrl: './scale-line.component.less',
})
export class ScaleLineComponent {
  width = 115;
  scaleCount = Math.floor(this.width / 5); // 每2px一个刻度, 2px 间隔
  colors = [
    ...interpolateColor(
      '#214A85',
      '#3C76D3',
      Math.ceil((this.scaleCount - 1) / 2),
    ), // 红色到绿色的渐变色
    ...interpolateColor(
      '#3C76D3',
      '#A0D0FC',
      Math.floor((this.scaleCount - 1) / 2),
    ),
  ]; // 红色到绿色的渐变色
  scaleArray = Array.from(
    { length: this.scaleCount },
    (_, i) => this.colors[i] || '#FFFFFF',
  ); // 确保每个刻度都有颜色，默认白色
  ngAfterViewInit() {}
  value = input(60); // 0 - 100

  stopIndex = computed(() => {
    return Math.floor((this.scaleCount * this.value()) / 100) - 1;
  });

  showStop = 0;

  constructor() {
    effect(() => {
      const stopIndex = this.stopIndex();
      this.showStop = 100;
      this.linearChangeShowStop();
    });
  }
  linearChangeShowStop() {
    const stopIndex = this.stopIndex();
    // const animationDuration = 300; // 动画持续时间，单位毫秒
    // const stepDuration = animationDuration / stopIndex; // 每个步骤的持续时间
    this.showStop = stopIndex;
    // for (let i = 0; i < stopIndex; i++) {
    //   setTimeout(() => {
    //     this.showStop = i + 1;
    //   }, i * stepDuration);
    // }
  }
}
