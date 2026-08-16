import { Component, effect, ElementRef, input, ViewChild } from '@angular/core';
import * as echarts from 'echarts';
import 'echarts-gl';

interface PieData {
  name: string;
  value: number;
  key: number;
  itemStyle: { color: string; opacity?: string };
}

// 生成模拟 3D 饼图的配置项
let getPie3D = (
  pieData: PieData[],
  internalDiameterRatio: number,
  height: number,
) => {
  let series: any[] = [];
  let sumValue = 0;
  let startValue = 0;
  let endValue = 0;
  let legendData: any[] = [];
  let k =
    typeof internalDiameterRatio !== 'undefined'
      ? (1 - internalDiameterRatio) / (1 + internalDiameterRatio)
      : 1 / 3;

  // 为每一个饼图数据，生成一个 series-surface 配置
  for (let i = 0; i < pieData.length; i++) {
    sumValue += pieData[i].value;
    let seriesItem: any = {
      name:
        typeof pieData[i].name === 'undefined' ? `series${i}` : pieData[i].name,
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
      let itemStyle = {} as PieData['itemStyle'];

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
  let linesSeries = [];
  for (let i = 0; i < series.length; i++) {
    endValue = startValue + series[i].pieData.value;

    series[i].pieData.startRatio = startValue / sumValue;
    series[i].pieData.endRatio = endValue / sumValue;
    series[i].parametricEquation = getParametricEquation(
      series[i].pieData.startRatio,
      series[i].pieData.endRatio,
      false,
      i === 0,
      k,
      height ? height : 10,
    );

    startValue = endValue;
    legendData.push(series[i].name);
  }
  series = series.concat(linesSeries);
  // 设置一个 2D环形图,在环形图中间展示数据名称与数据值
  series.push({
    name: 'pie2d',
    type: 'pie',
    // 环形图的内环与外环占比
    // radius: ['40%', '70%'],
    radius: ['30%', '55%'],
    center: ['47%', '50%'],
    avoidLabelOverlap: false,
    // label: {
    //   show: false,
    //   position: 'center',
    // },
    label: { opacity: 1, overflow: 'none' },
    itemStyle: {
      // 控制2D环形图的显隐  0 隐藏 1 显示
      opacity: 0.01,
    },
    // labelLine: {
    //   show: false,
    // },
    labelLine: {
      length: 20,
      length2: 10,
      lineStyle: {
        color: '#FFFFFF',
      },
    },
    clockwise: false,
    startAngle: 320,
    data: pieData.map((e) => ({
      ...e,
      itemStyle: undefined,
      // itemStyle: { color: 'transparent' },
    })),
  });

  // series.push({
  //   backgroundColor: 'transparent',
  //   name: 'pie2d',
  //   type: 'pie',
  //   label: { opacity: 1, overflow: 'none' },
  //   itemStyle: { opacity: 0.01 },
  //   labelLine: { length: 20, length2: 10 },
  //   startAngle: 100, // 起始角度，支持范围[0, 360]。
  //   clockwise: false, // 饼图的扇区是否是顺时针排布。上述这两项配置主要是为了对齐3d的样式
  //   radius: ['30%', '55%'],
  //   center: ['47%', '45%'],
  //   data: [
  //     { ...pieData[1], value: 9 },
  //     { ...pieData[0], itemStyle: { color: 'transparent' }, value: 17 },
  //     { ...pieData[0], value: 18 },
  //   ], // 与之前的series数据一致
  //   tooltip: {
  //     show: false,
  //   },
  // });

  // 准备待返回的配置项，把准备好的 legendData、series 传入。
  let option = {
    // legend: {
    //   data: legendData,
    //   bottom: 0,
    //   textStyle: {
    //     color: 'white',
    //     fontFamily: 'Source Han Sans CN',
    //     fontSize: 14,
    //   },
    // },
    color: pieData.map((e) => e.itemStyle.color),
    label: {
      show: true,
      // position: 'outside',
      formatter: function (params) {
        return `{d|${params.data.value}}`;
      },
      rich: {
        d: {
          fontSize: 18,
          lineHeight: 22,
          fontWeight: 'bold',
          fontFamily: 'DIN',
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
      min: -2,
      max: 2,
    },
    grid3D: {
      show: false,
      boxHeight: 2, //圆环的高度
      viewControl: {
        //3d效果可以放大、旋转等，请自己去查看官方配置
        alpha: 40, // 调整视图角度
        distance: 220, //调整视角到主体的距离，类似调整zoom
        rotateSensitivity: 0, //设置为0无法旋转
        zoomSensitivity: 0, //设置为0无法缩放
        panSensitivity: 0, //设置为0无法平移
        autoRotate: false,
      },
      //后处理特效可以为画面添加高光、景深、环境光遮蔽（SSAO）、调色等效果。可以让整个画面更富有质感。
      // postEffect: {
      //   //配置这项会出现锯齿，请自己去查看官方配置有办法解决
      //   enable: true,
      //   bloom: {
      //     enable: true,
      //     bloomIntensity: 1,
      //   },
      //   SSAO: {
      //     enable: true,
      //     quality: 'medium',
      //     radius: 2,
      //   },
      // },
    },
    series: series,
  };
  return option;
};

// startRatio（浮点数）: 当前扇形起始比例，取值区间[0, endRatio)
// endRatio（浮点数）: 当前扇形结束比例，取值区间(startRatio, 1]
// isSelected（布尔值）: 是否选中，效果参照二维饼图选中效果（单选）
// isHovered（布尔值）: 是否放大，效果接近二维饼图高亮（放大）效果（未能实现阴影）
// k（0~1之间的浮点数）：用于参数方程的一个参数，取值 0~1 之间，通过「内径 / 外径」的值换算而来。
//height配置3d扇形高度
const getParametricEquation = (
  startRatio,
  endRatio,
  isSelected,
  isHovered,
  k,
  height,
) => {
  // 计算
  let midRatio = (startRatio + endRatio) / 2;

  let startRadian = startRatio * Math.PI * 2;
  let endRadian = endRatio * Math.PI * 2;
  let midRadian = midRatio * Math.PI * 2;

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
    x: (u, v) => {
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

    y: (u, v) => {
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

    z: (u, v) => {
      if (u < -Math.PI * 0.5) {
        return Math.sin(u);
      }
      if (u > Math.PI * 2.5) {
        return Math.sin(u);
      }
      return Math.sin(v) > 0 ? 1 * height : -1;
    },
  };
};

const bindListen = (myChart, option, height) => {
  // 监听鼠标事件，实现饼图选中效果（单选），近似实现高亮（放大）效果。
  // 设置默认展示数据
  let defaultIndex = 0;
  // 与2D环形图的数据参数有关,可设置默认相中
  myChart.dispatchAction({
    type: 'highlight',
    // 第四个series中展示中的默认数值
    seriesIndex: 3,
    dataIndex: defaultIndex,
  });
};

@Component({
  selector: 'left-screen-handle-chart',
  imports: [],
  templateUrl: './handle-chart.component.html',
  styleUrl: './handle-chart.component.less',
})
export class LeftScreenHandleChartComponent {
  @ViewChild('chart') chartDom!: ElementRef<HTMLDivElement>;

  statusChart?: echarts.ECharts;

  monitoringAreaData: PieData[] = [
    {
      name: '抢修中',
      value: 0,
      key: 1, // 正在抢修
      itemStyle: { color: '#00b2fe ', opacity: '65%' },
    },
    {
      name: '已修复',
      value: 0,
      key: 2, // 已修复
      itemStyle: { color: '#14D2D2', opacity: '65%' },
    },
    {
      name: '未处置',
      value: 0,
      key: 0, // 未处置
      itemStyle: { color: '#BD83F9', opacity: '65%' },
    },
  ];

  events = input<ExtremeOcc.Event[]>([]);

  constructor() {
    effect(() => {
      const events = this.events();
      this.monitoringAreaData.forEach((item) => {
        item.value = events.filter(
          (ev) => ev.urgentRepair && ev.urgentRepairStatus === item.key,
        ).length;
      });
      let option = getPie3D(this.monitoringAreaData, 0.75, 10);
      this.statusChart?.setOption(option);
      this.statusChart?.off('click');
      this.statusChart && bindListen(this.statusChart, option, 10);
    });
  }

  ngAfterViewInit() {
    const dom = this.chartDom?.nativeElement;
    if (dom) {
      this.statusChart = echarts.init(dom, null, {
        devicePixelRatio: 1,
      });
      // 传入数据生成 option
      // let option = getPie3D(this.monitoringAreaData, 0.75, 10);
      // this.statusChart.setOption(option);
      // 添加事件
      // bindListen(this.statusChart, option, 10);
    }
  }
}
