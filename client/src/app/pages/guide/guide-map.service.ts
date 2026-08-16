import { Injectable } from '@angular/core';
import {
  GeoJSON,
  LatLngExpression,
  Proj,
  TileLayer,
  geoJson,
  tileLayer,
  type MapOptions,
} from 'leaflet';
import 'proj4leaflet';
import shpjs from 'shpjs';
import { environment as env } from '../../../environments/environment';

const centerPoint: LatLngExpression = [30.22, 132.49];

@Injectable({
  providedIn: 'root',
})
export class GuideMapService {
  _geoJSON?: Record<'shanghai' | 'cn', GeoJSON>;
  constructor() {}

  getLeafletOptions() {
    const leafletOptions: MapOptions = {
      crs: new Proj.CRS('EPSG:4490', '+proj=longlat +ellps=GRS80 +no_defs', {
        resolutions: [
          1.40625, 0.703125, 0.3515625, 0.17578125, 0.087890625, 0.0439453125,
          0.02197265625, 0.010986328125, 0.0054931640625, 0.00274658203125,
          0.001373291015625, 6.866455078125e-4, 3.4332275390625e-4,
          1.71661376953125e-4, 8.58306884765625e-5, 4.291534423828125e-5,
          2.1457672119140625e-5, 1.0728836059570312e-5, 5.364418029785156e-6,
          2.682209064925356e-6, 1.3411045324626732e-6,
        ],
        origin: [-180, 90],
      }),
      center: centerPoint,
      zoom: 6,
      minZoom: 6,
      maxZoom: 6,
      zoomControl: false,
      maxBounds: [
        // [32.10396, 125.260378],
        // [30.014771, 120.99949],
        // 左上：105.5  48.5
        // 右下：135.55  17.55
        [90.5, 195.55],
        [17.55, 105.5],
      ],
      maxBoundsViscosity: 1,
    };
    return leafletOptions;
  }
  getBaseLayers(): Record<string, TileLayer> {
    const url = `${env.mapUrl}/vec/{z}/{y}/{x}.png`;
    const url_c = `${env.mapUrl}/cva/{z}/{y}/{x}.png`;
    const vec = tileLayer(url, {});
    // vec.on('tileerror', function (this: TileLayer, e) {
    //   console.log(this, e);
    // });
    return {
      vec,
      cva: tileLayer(url_c, {}),
    };
  }

  async getProvincialRegions() {
    if (this._geoJSON) {
      return this._geoJSON;
    }
    // window.location.origin
    const geojson = await shpjs(
      window.location.origin +
        '/assets/shape/provincial-administration-regions-2020.zip',
    );
    // @ts-ignore
    const shanghaiGeojson = geojson.features.find(
      // @ts-ignore
      (f) => f.properties['省'] === '上海市',
    );
    let shanghaiGeo;
    if (shanghaiGeojson) {
      shanghaiGeo = geoJson(shanghaiGeojson, {
        style: {
          color: '#018CF2',
          weight: 4,
          opacity: 1,
          fillColor: '#018CF2',
          fillOpacity: 1,
        },
      });
      // return shanghaiGeo;
    }
    const transcripts = {
      ...geojson,
      // @ts-ignore
      features: geojson.features.filter(
        // @ts-ignore
        (f) => {
          const ignored = [
            '上海市',
            '中朝共有',
            '澳门特别行政区',
            '香港特别行政区',
          ];
          return !ignored.includes(f.properties['省']);
        },
      ),
    };

    const geo = geoJson(transcripts, {
      style: {
        color: '#1EA8FC80',
        weight: 1,
        opacity: 1,
        fillOpacity: 0,
      },
    });
    this._geoJSON = {
      shanghai: shanghaiGeo,
      cn: geo,
    };
    return this._geoJSON;
  }
}
