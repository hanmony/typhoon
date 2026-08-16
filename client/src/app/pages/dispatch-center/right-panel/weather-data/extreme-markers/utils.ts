export interface IWeatherMarker {
  type: string;
  degree: string;
  src?: string;
}

export function getWeatherType(weatherInChinese: string): string {
  switch (weatherInChinese) {
    case '台风':
      return 'typhoon';
    case '暴雨':
      return 'rain';
    case '暴雪':
      return 'snow';
    case '寒潮':
      return 'cold';
    case '大风':
      return 'wind';
    case '低温':
      return 'low';
    case '高温':
      return 'high';
    case '雷电':
      return 'thunder';
    case '大雾':
      return 'fog';
    case '霾':
      return 'haze';
    case '冰雹':
      return 'hailstone';
    case '道路结冰':
      return 'roadIcy';
    case '霜冻':
      return 'frost';
    default:
      return 'unknown';
  }
}
export function getWeatherColor(degreeInChinese: string): string {
  if (degreeInChinese.indexOf('蓝色') !== -1) {
    return 'blue';
  } else if (degreeInChinese.indexOf('黄色') !== -1) {
    return 'yellow';
  } else if (degreeInChinese.indexOf('橙色') !== -1) {
    return 'orange';
  } else if (degreeInChinese.indexOf('红色') !== -1) {
    return 'red';
  } else {
    return 'unknown';
  }
}

// 台风＞暴雨＞大风＞暴雪＞道路结冰＞冰雹＞霜冻＞雷电＞大雾＞寒潮＞低温＞高温＞霾

export const extremeWeatherTypesByOrder = [
  'typhoon',
  'rain',
  'wind',
  'snow',
  'roadIcy',
  'hailstone',
  'frost',
  'thunder',
  'fog',
  'cold',
  'low',
  'high',
  'haze',
];

export const extremeWeatherDegreesByOrder = ['red', 'orange', 'yellow', 'blue'];

export function sortWeatherMarker(ms: IWeatherMarker[]) {
  return ms.sort((a, b) => {
    const typeIndexA = extremeWeatherTypesByOrder.indexOf(a.type);
    const typeIndexB = extremeWeatherTypesByOrder.indexOf(b.type);
    if (typeIndexA !== typeIndexB) {
      return typeIndexA - typeIndexB;
    } else {
      const degreeIndexA = extremeWeatherDegreesByOrder.indexOf(a.degree);
      const degreeIndexB = extremeWeatherDegreesByOrder.indexOf(b.degree);
      return degreeIndexA - degreeIndexB;
    }
  });
}

export function separateBy4(ms: IWeatherMarker[]) {
  const result: IWeatherMarker[][] = [];
  for (let i = 0; i < ms.length; i += 4) {
    result.push(ms.slice(i, i + 4));
  }
  return result;
}
