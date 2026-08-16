/**
 * @description 生成时间轴天气图标名称数组
 * 该 script 需要在根目录下执行
 */

const fs = require('fs');
const path = require('path');

const WEATHER_ICON_PATH = path.join(__dirname, '..', 'assets/images/map/timeline', 'weather-icon');
// console.log(WEATHER_ICON_PATH);

const weatherIconArray = fs.readdirSync(WEATHER_ICON_PATH).map(file => {
  return {
    name: file.split('.')[0],
    path: `${WEATHER_ICON_PATH}/${file}`
  };
});
const weatherIconNameArray = weatherIconArray.map(icon => {
  const [degree, type] = icon.name.split('-')
  return `${degree}-${type}`
});
const uniqueWeatherIconNameArray = [...new Set(weatherIconNameArray)];
// console.log(uniqueWeatherIconNameArray);

fs.writeFile(path.join(__dirname, 'weatherIconArray.ts'),
  `export const weatherIconArray = ${JSON.stringify(uniqueWeatherIconNameArray)};`,
  (err) => {
    if (err) throw err;
  })
