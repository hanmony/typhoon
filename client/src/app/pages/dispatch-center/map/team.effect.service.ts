import { Injectable } from '@angular/core';
import { divIcon, LatLngExpression, Marker, marker } from 'leaflet';
import { linesData2026 } from '../../case-detail/services/meta';
import { MapEffectService } from './effect.service';

import 'proj4leaflet';

interface Team {
  id: string;
  doing: number;
  pending: number;
  position: LatLngExpression;
}

interface LocalTeam {
  position: LatLngExpression;
  name: string;
  state: string;
}

export const symbolPrefix = 'assets/images/dispatch-center/map/';
const markerBoxBg = symbolPrefix + 'team-marker-box.png';
const makerIcon = symbolPrefix + 'team-marker-icon.png';

const localSymbolMapping = {
  pending: symbolPrefix + 'hexagon-tool-blue.png',
  doing: symbolPrefix + 'hexagon-tool-yellow.png',
};

const localPopUpBoxSymbolMapping = {
  pending: symbolPrefix + 'team-detail-box-pending.png',
  doing: symbolPrefix + 'team-detail-box-doing.png',
};

const dummyRemoteTeams: Team[] = [
  {
    id: '1',
    pending: 5,
    doing: 2,
    position: [31.1572265625, 121.17095947265625],
  },
  {
    id: '1',
    pending: 260,
    doing: 91,
    position: [30.860595703125, 121.17645263671876],
  },
  {
    id: '1',
    pending: 229,
    doing: 15,
    position: [31.013031005859375, 121.68869018554686],
  },
];

const getRandomPosition = () => {
  const line = linesData2026[Math.floor(Math.random() * linesData2026.length)];
  const stations = line.points.filter((p) => p.type === 'station');
  return stations[Math.floor(Math.random() * stations.length)];
};

const dummyLocalTeams: LocalTeam[] = Array.from({ length: 50 }, () => {
  const position = getRandomPosition();
  return {
    position: position.coord as LatLngExpression,
    name: position.name as string,
    state: ['pending', 'doing'][Math.floor(Math.random() * 2)],
  };
});
// distinct local team array with name

const distinctDummyLocalTeams = dummyLocalTeams.reduce((acc, curr) => {
  const { name } = curr;
  const existing = acc.find((e) => e.name === name);
  if (existing) {
    return acc;
  }
  return [...acc, curr];
}, [] as LocalTeam[]);

@Injectable({
  providedIn: 'root',
})
export class MapTeamEffectService extends MapEffectService<Team | LocalTeam> {
  override renderLocalMarkers() {
    distinctDummyLocalTeams.forEach((team) => {
      const marker = this.getLocalMarker(team);
      this.featureGroup.addLayer(marker);
      this.dataWithMarker.push({ data: team, marker });
    });
  }

  override renderRemoteMarkers() {
    dummyRemoteTeams.forEach((team) => {
      const marker = this.getRemoteMarker(team);
      this.featureGroup.addLayer(marker);
      this.dataWithMarker.push({ data: team, marker });
    });
  }

  override getRemoteMarker(team: Team) {
    const { doing, pending, position } = team;
    const m = marker(position as LatLngExpression, {
      icon: divIcon({
        html: `<div class="w-full h-full relative flex flex-col justify-between p-8 pt-6 animate__animated animate__fadeInDown" style="background: url(${markerBoxBg}) no-repeat center center; background-size: 100% 100%;">
          <div class="flex items-center justify-between">
            <div class="pr-6">
              <img style="width: 88px" src="${makerIcon}" />
            </div>
            <div class="flex-1 flex flex-col pr-2">
              <div class="flex justify-between items-center">
                <span class="text-sm" style="color: #D8FEFF;">待机中</span>
                <span class="team-overlay-marker-count" style="--gradient-color: #3AD2A2;">${pending}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm" style="color: #D8FEFF;">抢修中</span>
                <span class="team-overlay-marker-count" style="--gradient-color: #EEAC00;">${doing}</span>
              </div>
            </div>
          </div>
        </div>
        `,
        className: 'hover-border',
        iconSize: [320, 148],
        iconAnchor: [160, 148],
      }),
    }) as Marker;
    return m;
  }
  override getLocalMarker(team: LocalTeam) {
    const { position, state } = team;
    const symbol = localSymbolMapping[state];
    const m = marker(position as LatLngExpression, {
      icon: divIcon({
        html: `<img src="${symbol}" class="w-full h-full animate__animated animate__fadeInDown" />`,
        className: 'hover-border',
        iconSize: [68, 105],
        iconAnchor: [34, 105],
      }),
      riseOnHover: true,
    }) as Marker;
    m.on('click', (p) => {
      this.toggleLocalPopUpBox(team);
    });
    return m;
  }
  override renderLocalPopUpBox(team: LocalTeam) {
    const m = this.getLocalPopUpBox(team);
    this.localPopUpBox = {
      data: team,
      marker: m,
    };
    m.addTo(this.map);
    m.setZIndexOffset(1000);
  }

  getLocalPopUpBox(team: LocalTeam) {
    const { position, name, state } = team;
    const boxSymbol = localPopUpBoxSymbolMapping[state];
    const mainColor = state === 'pending' ? '#39A1E0' : '#ED8303';
    const doneBg =
      state === 'pending'
        ? 'linear-gradient(90deg, #22DCFD 0%, #1C91E2 50%, #5865B9 100%);'
        : 'linear-gradient(90deg, #FACC22 0%, #F83600 100%);';

    const m = marker(position as LatLngExpression, {
      icon: divIcon({
        html: `<div class="w-full h-full relative text-xs animate__animated animate__zoomInLeft" style="background: url(${boxSymbol}) no-repeat center center; background-size: 100% 100%; backdrop-filter: blur(4px);">
         <div class="flex flex-col justify-between h-full pb-4">
            <div class="flex items-center justify-between">
              <span class="flex-1"></span>
              <span class="text-xs w-1/2 text-center" style="padding-bottom: 10px;">${name}</span>
              <span style="padding: 8px 10px 0 0;">
                <span class="flex-1 text-xs" style="
                  display: inline-block;
                  border-radius: 10px;
                  padding: 4px 10px;
                  border: 1px solid #FFFFFF;
                  background: ${mainColor};"
                >暂无处理事件</span>
              </span>
            </div>
            <div class="flex-1 flex flex-col justify-center">
              <div class="w-full flex items-center justify-between px-4 text-sm">
                <span>待命中</span>
                <span>抢修中</span>
                <span>整顿中</span>
              </div>
              <div class="w-full  px-8  pt-2 pb-4">
                <div style="background: ${doneBg};
                  height: 12px;
                  border-radius: 6px;
                  border: 1px solid ${mainColor};"
                >

                </div>
              </div>
            </div>
            <div class="flex items-center justify-between px-8">
              <div class="">
                <span class="text-sm">负责人：</span>
                <span class="text-sm inline-block" style="
                  box-shadow: inset 0px 0px 12px 0px ${mainColor}86;
                  padding: 0px 6px;
                  border-radius: 2px;"
                >阿拉蕾</span>
              </div>
              <div class="">
                <span class="text-sm">负责人电话：</span>
                <span class="text-sm inline-block" style="
                  box-shadow: inset 0px 0px 12px 0px ${mainColor}86;
                  padding: 0px 6px;
                  border-radius: 2px;"
                >15244545877</span>
              </div>
            </div>
         </div>
        </div>
        `,
        className: 'hover-border',
        iconSize: [407, 146],
        iconAnchor: [-((2 * 68) / 3), 105 * 1.5],
      }),
    });
    return m;
  }
}
