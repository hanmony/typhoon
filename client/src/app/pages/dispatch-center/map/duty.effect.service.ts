import { Injectable } from '@angular/core';
import { divIcon, LatLngExpression, Marker, marker } from 'leaflet';
import 'proj4leaflet';
import { linesData2026 } from '../../case-detail/services/meta';
import { MapEffectService } from './effect.service';

interface Duty {
  id: string;
  abundant: number;
  moderate: number;
  shortage: number;
  position: LatLngExpression;
}

interface LocalDuty {
  position: LatLngExpression;
  state: string;
  name: string;
}

const symbolPrefix = 'assets/images/dispatch-center/map/';
const markerBoxBg = symbolPrefix + 'duty-marker-box.png';
const popupBoxSymbol = symbolPrefix + 'duty-detail-box.png';
const symbolMapping = {
  abundant: symbolPrefix + 'cube-green.png',
  moderate: symbolPrefix + 'cube-blue.png',
  shortage: symbolPrefix + 'cube-red.png',
};

const localSymbolMapping = {
  abundant: symbolPrefix + 'duty-marker-green.png',
  moderate: symbolPrefix + 'duty-marker-blue.png',
  shortage: symbolPrefix + 'duty-marker-red.png',
};

const items = [
  { symbol: symbolMapping.abundant, text: '物资充裕', key: 'abundant' },
  { symbol: symbolMapping.moderate, text: '物资适中', key: 'moderate' },
  { symbol: symbolMapping.shortage, text: '物资短缺', key: 'shortage' },
];

const dummyRemoteTeams: Duty[] = [
  {
    id: '1',
    abundant: 35,
    moderate: 57,
    shortage: 68,
    position: [31.17645263671875, 121.24649047851562],
  },
  {
    id: '1',
    abundant: 39,
    moderate: 83,
    shortage: 57,
    position: [30.96084594726563, 121.20666503906249],
  },
  {
    id: '1',
    abundant: 72,
    moderate: 14,
    shortage: 20,
    position: [30.97183227539062, 121.68731689453125],
  },
  {
    id: '1',
    abundant: 2,
    moderate: 60,
    shortage: 51,
    position: [30.864715576171875, 121.49642944335938],
  },
];
const getRandomPosition = () => {
  const line = linesData2026[Math.floor(Math.random() * linesData2026.length)];
  const stations = line.points.filter((p) => p.type === 'station');
  return stations[Math.floor(Math.random() * stations.length)];
};

const dummyLocalDuty: LocalDuty[] = Array.from({ length: 50 }, () => {
  const position = getRandomPosition();
  return {
    position: position.coord as LatLngExpression,
    name: position.name as string,
    state: ['abundant', 'moderate', 'shortage'][Math.floor(Math.random() * 3)],
  };
});
// distinct duty array with name

const distinctDummyLocalDuty = dummyLocalDuty.reduce((acc, curr) => {
  const { name } = curr;
  const existing = acc.find((e) => e.name === name);
  if (existing) {
    return acc;
  }
  return [...acc, curr];
}, [] as LocalDuty[]);

@Injectable({
  providedIn: 'root',
})
export class MapDutyEffectService extends MapEffectService<Duty | LocalDuty> {
  override renderLocalMarkers() {
    distinctDummyLocalDuty.forEach((duty) => {
      const marker = this.getLocalMarker(duty);
      this.featureGroup.addLayer(marker);
      this.dataWithMarker.push({ data: duty, marker });
    });
  }

  override renderRemoteMarkers() {
    dummyRemoteTeams.forEach((duty) => {
      const marker = this.getRemoteMarker(duty);
      this.featureGroup.addLayer(marker);
      this.dataWithMarker.push({ data: duty, marker });
    });
  }

  override getRemoteMarker(duty: Duty) {
    const { position } = duty;
    const htmlPrefix = `<div class="w-full h-full relative flex flex-col justify-between p-8 pt-7 animate__animated animate__fadeInDown" style="background: url(${markerBoxBg}) no-repeat center center; background-size: 100% 100%;">`;
    const getItem = (symbol: string, text: string, count: number) => {
      return `<div class="flex items-center justify-between">
          <div>
            <img src="${symbol}"></img>
          </div>
           <div class="text-base">${text}：${count}</div>
        </div>`;
    };
    let htmlContent = items
      .map((item) => getItem(item.symbol, item.text, duty[item.key]))
      .join('');
    const htmlSuffix = '</div>';
    const m = marker(position as LatLngExpression, {
      icon: divIcon({
        html: htmlPrefix + htmlContent + htmlSuffix,
        className: 'hover-border',
        iconSize: [221, 154],
        iconAnchor: [110.5, 154],
      }),
    }) as Marker;
    return m;
  }

  override getLocalMarker(duty: LocalDuty) {
    const { position, state } = duty;
    const symbol = localSymbolMapping[state];
    const m = marker(position as LatLngExpression, {
      icon: divIcon({
        html: `<img src="${symbol}" class="w-full h-full animate__animated animate__fadeInDown" />`,
        className: 'hover-border',
        iconSize: [71, 98],
        iconAnchor: [35.5, 98],
      }),
      riseOnHover: true,
    }) as Marker;
    m.on('click', (p) => {
      this.toggleLocalPopUpBox(duty);
    });
    return m;
  }
  override renderLocalPopUpBox(duty: LocalDuty) {
    const m = this.getLocalPopUpBox(duty);
    this.localPopUpBox = {
      data: duty,
      marker: m,
    };
    m.addTo(this.map);
    m.setZIndexOffset(1000);
  }

  getLocalPopUpBox(duty: LocalDuty) {
    const { position, name, state } = duty;
    const m = marker(position as LatLngExpression, {
      icon: divIcon({
        html: `<div class="w-full h-full relative animate__animated animate__zoomInLeft" style="background: url(${popupBoxSymbol}) no-repeat center center; background-size: 100% 100%; backdrop-filter: blur(4px);">
          <div class="h-full flex flex-col justify-center px-6">
            <div class="text-lg" style="
              font-weight: 400;
              font-size: 20px;
              font-family: Fangzhengzhongyi;
              color: #1EE3F3;"
            >
              ${name}值守点
            </div>
            <div class=" text-base">
              ${items.find((i) => i.key === state)?.text || ''}
            </div>
          </div>
        </div>
        `,
        className: 'hover-border',
        iconSize: [274, 99],
        iconAnchor: [-((2 * 71) / 3), 98 + 8],
      }),
    });
    return m;
  }
}
