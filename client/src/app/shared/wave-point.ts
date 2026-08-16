import {
  divIcon,
  LatLngExpression,
  LeafletMouseEvent,
  Marker,
  marker,
} from 'leaflet';

import 'proj4leaflet';

type ClickCallback = (e: LeafletMouseEvent) => void;

interface CreateWaveParams {
  position: LatLngExpression;
  zoom?: number;
  color: string;
  clickCallback?: ClickCallback;
}

const radiusMap = [+0, 0, +0, 100, 80, 30, 20, 10];
const pointWidthMap = [+0, +3, +5, +11, 13, 16, 21, 21];

function getRadius(zoom = 10) {
  const minZoom = 9;
  return radiusMap[zoom - minZoom] || 0;
}
function getPointWidth(zoom = 10) {
  const minZoom = 9;
  return pointWidthMap[zoom - minZoom] || 0;
}

export function getWavePointIcon(shiningColor: string, zoom = 10) {
  const width = getPointWidth(zoom);
  return divIcon({
    html: `
          <div class="block rounded-full ${
            width ? 'play-pulse' : ''
          }" style="z-index: 800;width: ${width}px; height: ${width}px; --shadow-width: ${
            width * 0.65
          }px; --shadow-color: ${shiningColor};"></div>
        `,
    // html: meta.name,
    className: 'rounded-full',
    iconSize: [width, width],
    iconAnchor: [width / 2, width / 2],
  });
}

export function getWavePointMarker(params: CreateWaveParams) {
  const { position, zoom, color, clickCallback = () => {} } = params;
  const m = marker(position as LatLngExpression, {
    icon: getWavePointIcon(color, zoom),
    riseOnHover: true,
    zIndexOffset: 1,
  }) as Marker;
  m.on('click', (p) => {
    clickCallback(p);
  });
  return m;
}
