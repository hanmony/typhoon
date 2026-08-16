import * as echarts from 'echarts';

export const getOption = (data: number[]) => {
  return {
    backgroundColor: 'transparent',
    // title: {
    //   text: '',
    //   x: 'center',
    //   y: '4%',
    //   textStyle: {
    //     color: '#fff',
    //     fontSize: '22',
    //   },
    //   subtextStyle: {
    //     color: '#90979c',
    //     fontSize: '16',
    //   },
    // },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    grid: {
      top: '9%',
      right: '3%',
      left: '10%',
      bottom: '12%',
    },
    xAxis: [
      {
        type: 'category',
        data: ['重点事件', '普通事件'],
        axisLine: {
          lineStyle: {
            color: 'rgba(255,255,255,0.12)',
          },
        },
        axisLabel: {
          margin: 10,
          color: '#e2e9ff',
          fontSize: 14,
        },
      },
    ],
    yAxis: [
      {
        name: '',
        axisLabel: {
          formatter: '{value}',
          color: '#e2e9ff',
        },
        minInterval: 1,
        axisLine: {
          show: false,
          lineStyle: {
            color: 'rgba(255,255,255,1)',
          },
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255,255,255,0.12)',
          },
        },
      },
    ],
    series: [
      {
        type: 'bar',
        data: data,
        barWidth: '20px',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(
            0,
            0,
            0,
            1,
            [
              {
                offset: 0,
                color: 'rgba(0,244,255,1)', // 0% 处的颜色
              },
              {
                offset: 1,
                color: 'rgba(0,77,167,1)', // 100% 处的颜色
              },
            ],
            false,
          ),
          borderRadius: [30, 30, 30, 30],
          shadowColor: 'rgba(0,160,221,1)',
          shadowBlur: 4,
        },
        label: {
          show: true,
          lineHeight: 30,
          width: 40,
          height: 30,
          backgroundColor: 'transparent',
          borderRadius: 200,
          position: ['-8', '-26'],
          distance: 1,
          formatter: `'{d|●} {a|{c}}'`,
          rich: {
            d: {
              color: '#3CDDCF',
            },
            a: {
              color: '#fff',
              align: 'center',
            },
            b: {
              width: 1,
              height: 30,
              borderWidth: 1,
              borderColor: '#234e6c',
              align: 'left',
            },
          },
        },
      },
    ],
  };
};
