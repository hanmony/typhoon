import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  Input,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as echarts from 'echarts';
import 'echarts-gl';
import { AutoScrollComponent } from '../../../../shared/auto.scroll';
import { linesData2026 } from '../../../case-detail/services/meta';

@Component({
  selector: 'supervisor-real-time-close',
  imports: [CommonModule],
  templateUrl: './real-time-close.component.html',
  styleUrl: './real-time-close.component.less',
})
export class RealTimeCloseComponent extends AutoScrollComponent {
  @ViewChild('scrollContainer')
  override scrollContainer!: ElementRef<HTMLDivElement>;
  override fixHeight = 138;

  @ViewChild('chart') chartDom!: ElementRef<HTMLDivElement>;
  pieChart?: echarts.ECharts;

  @Input() operations: ExtremeOcc.Operation[] = [];

  separatedLineCloseData = linesData2026.map((line) => {
    const mainStations = line.points.filter(
      (point) => point.type === 'station',
    );
    const branchStations = Array.from(line.branches.values())
      .flat()
      .map((p) => (p.type === 'station' ? p : null))
      .filter((p) => p !== null);
    const allStations = [...mainStations, ...branchStations];

    return {
      name: line.name === '机场联络线' ? '机场线' : line.name,
      total: allStations.length,
      closed: 0,
      closedPercent: 0,
      percent: 0,
    };
  });

  totalLineCloseData = [
    {
      name: '关闭站点',
      value: 0,
      itemStyle: { color: '#FF7F00' },
    },
    {
      name: '开放站点',
      value: 10,
      itemStyle: { color: '#00A8FF' },
    },
  ];

  ngOnInit() {
    this.updateTotalLineCloseData();
  }

  ngOnChanges(simpleChanges: SimpleChanges) {
    if (simpleChanges['operations']) {
      this.updateLineCloseData();
      this.setPie(this.totalLineCloseData, this.pieChart);
    }
  }
  override ngAfterViewInit() {
    this.setScrollHeight();
    this.autoScroll();
    // this.resetData();
    setTimeout(() => {
      const dom = this.chartDom?.nativeElement;
      if (dom) {
        this.pieChart = echarts.init(dom);
        // this.setOption(window.innerWidth);
        // this.bindListen(this.statusChart);
        this.setPie(this.totalLineCloseData, this.pieChart);
      }
    }, 400);
  }

  updateLineCloseData() {
    this.separatedLineCloseData.forEach((line) => {
      line.closed = 0;
      line.percent = 100;
      line.closedPercent = 0;
    });

    const ops = this.operations.filter((op) => op.actionType === '站点关闭');
    const map = new Map<string, Set<string>>();
    ops.forEach((op) => {
      const lineSet = map.get(op.line);
      if (lineSet) {
        lineSet.add(op.startStation);
      } else {
        map.set(op.line, new Set([op.startStation]));
      }
    });

    this.separatedLineCloseData.forEach((line) => {
      if (!map.has(line.name)) {
        return;
      }
      const closedStations = map.get(line.name)!;
      line.closed = closedStations.size;
      line.closedPercent = Math.floor((line.closed / line.total) * 100);
      line.percent = 100 - line.closedPercent;
    });
    this.updateTotalLineCloseData();
  }

  updateTotalLineCloseData() {
    const total = this.separatedLineCloseData.reduce(
      (acc, line) => acc + line.total,
      0,
    );
    const closed = this.separatedLineCloseData.reduce(
      (acc, line) => acc + line.closed,
      0,
    );

    const previousClosed = this.totalLineCloseData[0].value;
    if (previousClosed === closed) {
      return;
    }
    this.totalLineCloseData[0].value = closed;
    this.totalLineCloseData[1].value = total - closed;
    // this.totalLineCloseData = [...this.totalLineCloseData]; // 触发视图更新
    // this.setPie(this.totalLineCloseData, this.pieChart);
  }

  setPie(pieData, myChart) {
    if (!myChart) return;
    // myChart.dispose();
    // if (myChart) myChart.dispose();
    var option = this.getPie3D(pieData);
    const total = pieData.reduce((acc, e) => acc + e.value, 0);
    //是否需要label指引线，如果要就添加一个透明的2d饼状图并调整角度使得labelLine和3d的饼状图对齐，并再次setOption
    option.series.push({
      backgroundColor: 'transparent',
      name: 'pie2d',
      type: 'pie',
      label: {
        opacity: 1,
        overflow: 'none',
        formatter: function (params) {
          return `{c|${params.data.name}}\n{d|${Math.round((params.data.actual / total) * 10000) / 100 || 0}%}`;
        },
      },
      itemStyle: { opacity: 0.01 },
      labelLine: { length: 12, length2: 8 },
      startAngle: 10, // 起始角度，支持范围[0, 360]。
      clockwise: false, // 饼图的扇区是否是顺时针排布。上述这两项配置主要是为了对齐3d的样式
      radius: ['30%', '55%'],
      center: ['47%', '50%'],
      data: [
        // {
        //   ...pieData[0],
        //   itemStyle: { color: 'transparent' },
        //   value: (pieData[0].value + pieData[1].value) / 2,
        // },
        {
          ...pieData[1],
          value: (pieData[0].value + pieData[1].value) / 2,
          actual: pieData[1].value,
        }, // 与之前的series数据一致
        // 这里的value是为了对齐3d饼图的labelLine
        {
          ...pieData[0],
          value: (pieData[0].value + pieData[1].value) / 2,
          actual: pieData[0].value,
        }, // 与之前的series数据一致
      ], // 与之前的series数据一致
      tooltip: {
        show: false,
      },
    });

    // myChart = echarts.init(document.getElementById(id));
    myChart.setOption(option);
    myChart.off('click'); // 防止重复绑定点击事件
    // 添加点击事件
    // myChart.on('click', (params) => eventName(params, this.mapTitle));
    // window.addEventListener('resize', () => myChart.resize());
  }
  getPie3D(pieData: any): any {
    // internalDiameterRatio:透明的空心占比
    const total = pieData.reduce((acc, e) => acc + e.value, 0);
    let series: any[] = [];
    let sumValue = 0;
    let startValue = 0;
    let endValue = 0;
    let k = 1;
    // pieData.sort((a, b) => {
    //   return b.value - a.value;
    // });
    // 为每一个饼图数据，生成一个 series-surface 配置
    for (let i = 0; i < pieData.length; i++) {
      sumValue += pieData[i].value;
      let seriesItem: any = {
        name:
          typeof pieData[i].name === 'undefined'
            ? `series${i}`
            : pieData[i].name,
        type: 'surface',
        parametric: true,
        wireframe: {
          show: false,
        },
        pieData: pieData[i],
        pieStatus: {
          selected: false,
          hovered: false,
          k: k,
        },
        radius: '50%',
        center: ['10%', '10%'],
      };

      if (typeof pieData[i].itemStyle != 'undefined') {
        let itemStyle: any = {};
        typeof pieData[i].itemStyle.color != 'undefined'
          ? (itemStyle.color = pieData[i].itemStyle.color)
          : null;
        typeof pieData[i].itemStyle.opacity != 'undefined'
          ? (itemStyle.opacity = pieData[i].itemStyle.opacity)
          : null;
        seriesItem.itemStyle = itemStyle;
      }
      series.push(seriesItem);
    }

    // 使用上一次遍历时，计算出的数据和 sumValue，调用 getParametricEquation 函数，
    // 向每个 series-surface 传入不同的参数方程 series-surface.parametricEquation，也就是实现每一个扇形。

    for (let i = 0; i < series.length; i++) {
      endValue = startValue + series[i].pieData.value;
      series[i].pieData.startRatio = startValue / sumValue;
      series[i].pieData.endRatio = endValue / sumValue;
      series[i].parametricEquation = this.getParametricEquation(
        series[i].pieData.startRatio,
        series[i].pieData.endRatio,
        false,
        false,
        k,
        10,
      );
      startValue = endValue;
    }
    let boxHeight = this.getHeight3D(series, total); //通过传参设定3d饼/环的高度，26代表26px
    // 准备待返回的配置项，把准备好的 legendData、series 传入。
    let option = {
      // 引导线配置
      labelLine: {
        show: true,
        lineStyle: {
          color: 'transparent',
          // normal: {},
        },
      },
      label: {
        show: true,
        // position: 'outside',
        formatter: function (params) {
          return `{d|${Math.round((params.data.value / total) * 100) || 0}%}`;
        },
        rich: {
          c: {
            fontSize: 12,
            lineHeight: 16,
            color: '#ffffff',
          },
          d: {
            fontSize: 14,
            lineHeight: 16,
            fontWeight: 'normal',
            color: 'inherit',
          },
        },
      },
      xAxis3D: {
        min: -1,
        max: 1,
      },
      yAxis3D: {
        min: -1,
        max: 1,
      },
      zAxis3D: {
        min: -1,
        max: 1,
      },
      grid3D: {
        show: false,
        boxHeight: boxHeight, //圆环的高度
        left: -8,
        top: -20, //3d饼图的位置
        viewControl: {
          // 3d效果可以放大、旋转等，请自己去查看官方配置
          alpha: this.alpha, //角度
          // 饼块开始得角度
          beta: this.beta || 60,
          distance: this.distance, //调整视角到主体的距离，类似调整zoom
          rotateSensitivity: 0, //设置为0无法旋转
          zoomSensitivity: 0, //设置为0无法缩放
          panSensitivity: 0, //设置为0无法平移
          autoRotate: false, //自动旋转
        },
      },
      series: series,
    };
    return option;
  }
  alpha = 16; // 俯仰角
  beta = 60;
  distance = 400; // 视距， 控制大小
  //获取3d饼图的最高扇区的高度
  getHeight3D(series: any, height: number) {
    // series.sort((a, b) => {
    //   return b.pieData.value - a.pieData.value;
    // });
    // return (height * 15) / series[0].pieData.value;
    return 20;
  }
  // 生成扇形的曲面参数方程，用于 series-surface.parametricEquation
  getParametricEquation(startRatio, endRatio, isSelected, isHovered, k, h) {
    // 计算
    let midRatio = (startRatio + endRatio) / 2;
    let startRadian = startRatio * Math.PI * 2;
    let endRadian = endRatio * Math.PI * 2;
    let midRadian = midRatio * Math.PI * 2;
    // 如果只有一个扇形，则不实现选中效果。
    if (startRatio === 0 && endRatio === 1) {
      isSelected = true;
    }
    // 通过扇形内径/外径的值，换算出辅助参数 k（默认值 1/3）
    k = typeof k !== 'undefined' ? k : 1 / 3;
    // 计算选中效果分别在 x 轴、y 轴方向上的位移（未选中，则位移均为 0）
    let offsetX = isSelected ? Math.cos(midRadian) * 0.1 : 0;
    let offsetY = isSelected ? Math.sin(midRadian) * 0.1 : 0;
    // 计算高亮效果的放大比例（未高亮，则比例为 1）
    let hoverRate = isHovered ? 1.05 : 1;
    // 返回曲面参数方程
    return {
      u: {
        min: -Math.PI,
        max: Math.PI * 3,
        step: Math.PI / 32,
      },
      v: {
        min: 0,
        max: Math.PI * 2,
        step: Math.PI / 20,
      },
      x: function (u, v) {
        if (u < startRadian) {
          return (
            offsetX + Math.cos(startRadian) * (1 + Math.cos(v) * k) * hoverRate
          );
        }
        if (u > endRadian) {
          return (
            offsetX + Math.cos(endRadian) * (1 + Math.cos(v) * k) * hoverRate
          );
        }
        return offsetX + Math.cos(u) * (1 + Math.cos(v) * k) * hoverRate;
      },
      y: function (u, v) {
        if (u < startRadian) {
          return (
            offsetY + Math.sin(startRadian) * (1 + Math.cos(v) * k) * hoverRate
          );
        }
        if (u > endRadian) {
          return (
            offsetY + Math.sin(endRadian) * (1 + Math.cos(v) * k) * hoverRate
          );
        }
        return offsetY + Math.sin(u) * (1 + Math.cos(v) * k) * hoverRate;
      },
      z: function (u, v) {
        if (u < -Math.PI * 0.5) {
          return Math.sin(u);
        }
        if (u > Math.PI * 2.5) {
          return Math.sin(u) * h * 0.1;
        }
        return Math.sin(v) > 0 ? 1 * h * 0.1 : -1;
        // return 20;
      },
    };
  }
}
