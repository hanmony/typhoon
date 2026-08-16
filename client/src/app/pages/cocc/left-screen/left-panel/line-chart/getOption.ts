import * as echarts from 'echarts';

const getAdditionalData = (data: number[]) => {
  const result = data.slice();
  const startDiff = data[0] - data[1];
  const endDiff = data[data.length - 1] - data[data.length - 2];
  result.unshift((startDiff || 1) / 3 + data[0]);
  result.push((endDiff || 1) / 3 + data[data.length - 1]);
  return result;
};

const getPaddingData = (data: number[]) => {
  const result = data.slice();
  result.unshift(0);
  result.push(0);
  return result;
};
export const getOption = (
  data: { type: string; count: number }[],
  pageWidth: number = 1920,
) => {
  const scale = Number((pageWidth / 1920).toFixed(1));
  const additionalData = getAdditionalData(data.map((d) => d.count));
  const paddingData = getPaddingData(data.map((d) => d.count));
  return {
    tooltip: {
      show: false,
      trigger: 'axis',
      axisPointer: {
        // type: 'shadow',
      },
    },
    grid: {
      top: '8%',
      right: '1',
      left: '1%',
      bottom: '5%',
      containLabel: true,
    },

    xAxis: {
      type: 'category',
      boundaryGap: false,
      axisLabel: {
        color: '#fff',
        interval: 0,
        fontSize: scale * 13,
        padding: [scale * 10, 0, 0, 0],
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: '#ffffff30',
        },
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        show: false,
      },
      data: ['', ...data.map((d) => d.type), ''],
    },

    yAxis: [
      {
        type: 'value',
        name: '',
        min: 0,
        nameTextStyle: {
          color: '#fff',
          fontSize: scale * 14,
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#ffffff30',
          },
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
      },
      {
        type: 'value',
        // name: '%',
        min: 0,
        nameTextStyle: {
          color: '#fff',
          fontSize: scale * 14,
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#ffffff30',
          },
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
      },
    ],
    series: [
      {
        name: '',
        type: 'pictorialBar',
        // symbolSize: [20, 10],
        symbolSize: (value: number, param: any) => {
          const index = param.dataIndex;
          if (index === 0 || index > data.length) {
            return [0, 0]; //虚拟数据上不显示标点
          } else {
            return [scale * 26, scale * 10];
          }
        },
        symbolOffset: [0, scale * -5],
        symbolPosition: 'end',
        z: 12,
        // "barWidth": "0",
        tooltip: {
          show: false,
        },
        color: '#008ed7',
        data: additionalData,
      },
      {
        name: '',
        type: 'pictorialBar',
        // symbolSize: [20, 10],
        symbolSize: (value: number, param: any) => {
          const index = param.dataIndex;
          if (index === 0 || index > data.length) {
            return [0, 0]; //虚拟数据上不显示标点
          } else {
            return [scale * 26, scale * 10];
          }
        },
        symbolOffset: [0, scale * 5],
        // "barWidth": "20",
        z: 12,
        tooltip: {
          show: false,
        },
        color: '#00abff',
        // data: ['43', '19', '18', '32'],
        data: additionalData,
      },
      {
        type: 'bar',
        //silent: true,
        barWidth: scale * 26,

        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 0.8, [
            {
              offset: 0,
              color: '#00D8FF',
            },
            {
              offset: 1,
              color: '#00A8FF',
            },
          ]),
          // linear-gradient(0deg, #2A76FF 0%, #00A8FF 0%, #00D8FF 100%);
          opacity: 0.95,
        },
        data: paddingData,
      },
      {
        name: '',
        type: 'line',
        yAxisIndex: 1,
        symbol: 'circle', // 默认是空心圆（中间是白色的），改成实心圆
        smooth: false,
        lineStyle: {
          width: scale * 1,
          color: '#00D8FF', // 线条颜色
        },
        itemStyle: {
          color: '#071c33', //拐点颜色
          borderColor: '#00D8FF', //拐点边框颜色
          borderWidth: scale * 1, //拐点边框大小
        },
        label: {
          show: true, //开启显示
          color: '#fff',
          position: 'top', //在上方显示
          formatter: function (param: any) {
            const index = param.dataIndex;
            if (index === 0 || index > data.length) {
              return '';
            } else {
              if (param.value) {
                return param.value;
              } else {
                return 0;
              }
            }
          },
        },
        // symbolSize: 9, //设定实心点的大小
        symbolSize: (value: number, param: any) => {
          const index = param.dataIndex;
          if (index === 0 || index > data.length) {
            return 0; //虚拟数据上不显示标点
          } else {
            return scale * 9;
          }
        },
        areaStyle: {
          //线性渐变，前4个参数分别是x0,y0,x2,y2(范围0~1);相当于图形包围盒中的百分比。如果最后一个参数是‘true’，则该四个值是绝对像素位置。
          color: new echarts.graphic.LinearGradient(
            0,
            0,
            0,
            1,
            [
              {
                offset: 0,
                color: '#29a5d530',
              },
              {
                offset: 0.6,
                color: '#29a5d520',
              },
              {
                offset: 1,
                color: '#29a5d510',
              },
            ],
            false,
          ),
        },
        data: additionalData,
      },
    ],
  };
};
