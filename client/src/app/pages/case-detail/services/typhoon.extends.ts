import L, { LatLngTuple, Map, PolylineOptions } from 'leaflet';
import 'proj4leaflet';

interface TyphoonOptions extends PolylineOptions {
  ne: number;
  se: number;
  sw: number;
  nw: number;
}

export const TyphoonLayer: (new (...args: any[]) => any) & typeof L.Class =
  L.Polygon.extend({
    initialize: function (t: LatLngTuple, e: TyphoonOptions, i: any) {
      // @ts-ignore
      L.Polygon.prototype.initialize.call(this, e),
        (this._latlng = L.latLng(t)),
        (this._circle = e),
        (this._style = i);
    },
    options: { fill: !0 },

    cache: {
      _radius_northeast: null,
      _radius_southeast: null,
      _radius_southwest: null,
      _radius_northwest: null,
      svgPath: '',
    },
    customUpdate: function (t: LatLngTuple, e: TyphoonOptions, i: any) {
      this._latlng = L.latLng([
        parseFloat(t[0].toFixed(6)),
        parseFloat(t[1].toFixed(6)),
      ]);
      this._circle = e;
      this._style = i;
      this._update();
    },
    latLngToLayerPoint: function (latlng: any) {
      var projectedPoint = this._map.project(latlng);
      return projectedPoint._subtract(this._map.getPixelOrigin());
    },
    projectLatlngs: function () {
      try {
        var e = this._latlng;
        this._point = this.latLngToLayerPoint(e);
        var t_northeast = this._getLngRadius(
            this._getLatRadius(this._circle.ne * 1000),
          ),
          i_northeast = this.latLngToLayerPoint([e.lat, e.lng - t_northeast]);
        this._radius_northeast = this._point.x - i_northeast.x;
        var t_southeast = this._getLngRadius(
            this._getLatRadius(this._circle.se * 1000),
          ),
          i_southeast = this.latLngToLayerPoint([e.lat, e.lng - t_southeast]);
        this._radius_southeast = this._point.x - i_southeast.x;
        var t_southwest = this._getLngRadius(
            this._getLatRadius(this._circle.sw * 1000),
          ),
          i_southwest = this.latLngToLayerPoint([e.lat, e.lng - t_southwest]);
        this._radius_southwest = this._point.x - i_southwest.x;
        var t_northwest = this._getLngRadius(
            this._getLatRadius(this._circle.nw * 1000),
          ),
          i_northwest = this.latLngToLayerPoint([e.lat, e.lng - t_northwest]);
        this._radius_northwest = this._point.x - i_northwest.x;
        this.cachingRadius();
      } catch (e) {
        this._radius_northeast = null;
        this._radius_southeast = null;
        this._radius_southwest = null;
        this._radius_northwest = null;
        this.cachingRadius();
      }
    },
    isEqualToCache: function () {
      return (
        this.cache._radius_northeast === this._radius_northeast &&
        this.cache._radius_southeast === this._radius_southeast &&
        this.cache._radius_southwest === this._radius_southwest &&
        this.cache._radius_northwest === this._radius_northwest
      );
    },
    cachingRadius: function () {
      this.cache._radius_northeast = this._radius_northeast;
      this.cache._radius_southeast = this._radius_southeast;
      this.cache._radius_southwest = this._radius_southwest;
      this.cache._radius_northwest = this._radius_northwest;
    },
    getTyphoonPath: function () {
      if (
        this._radius_northeast &&
        this._radius_southeast &&
        this._radius_southwest &&
        this._radius_northwest
      ) {
        var t = this._point;
        var e_northeast = this._radius_northeast;
        var path_svg = 'M' + t.x + ',' + (t.y - e_northeast);
        var path_vml = 'M' + t.x + ',' + (t.y - e_northeast);
        path_svg +=
          'A' +
          e_northeast +
          ',' +
          e_northeast +
          ',0,0,1,' +
          (t.x + e_northeast) +
          ',' +
          t.y;
        path_vml +=
          ' ae ' +
          t.x +
          ',' +
          t.y +
          ' ' +
          e_northeast +
          ',' +
          e_northeast +
          ' ' +
          65535 * 450 +
          ',' +
          -5898150;
        var e_southeast = this._radius_southeast;
        path_svg += 'L' + (t.x + e_southeast) + ',' + t.y;
        path_svg +=
          'A' +
          e_southeast +
          ',' +
          e_southeast +
          ',0,0,1,' +
          t.x +
          ',' +
          (t.y + e_southeast);
        path_vml +=
          ' ae ' +
          t.x +
          ',' +
          t.y +
          ' ' +
          e_southeast +
          ',' +
          e_southeast +
          ' ' +
          65535 * 360 +
          ',' +
          -5898150;
        var e_southwest = this._radius_southwest;
        path_svg += 'L' + t.x + ',' + (t.y + e_southwest);
        path_svg +=
          'A' +
          e_southwest +
          ',' +
          e_southwest +
          ',0,0,1,' +
          (t.x - e_southwest) +
          ',' +
          t.y;
        path_vml +=
          ' ae ' +
          t.x +
          ',' +
          t.y +
          ' ' +
          e_southwest +
          ',' +
          e_southwest +
          ' ' +
          65535 * 270 +
          ',' +
          -5898150;
        var e_northwest = this._radius_northwest;
        path_svg += 'L' + (t.x - e_northwest) + ',' + t.y;
        path_svg +=
          'A' +
          e_northwest +
          ',' +
          e_northwest +
          ',0,0,1,' +
          t.x +
          ',' +
          (t.y - e_northwest) +
          'z';
        path_vml +=
          ' ae ' +
          t.x +
          ',' +
          t.y +
          ' ' +
          e_northwest +
          ',' +
          e_northwest +
          ' ' +
          65535 * 180 +
          ',' +
          -5898150 +
          'X';
        this.cache.svgPath = this.svgPath;
        this.svgPath = L.Browser.svg ? path_svg : path_vml;
        return L.Browser.svg ? path_svg : path_vml;
      }
      return '';
    },
    beforeAdd: function (map: Map) {
      this._renderer = map.getRenderer(this);
    },
    onAdd: function (map: Map) {
      this.projectLatlngs();
      this.getTyphoonPath();
      this._renderer._initPath(this);
      this._reset();
      this.svgPath && this._path.setAttribute('d', this.svgPath);
      this._renderer._addPath(this);
      this._setStyle(this._style);
    },

    _update: function () {
      this.cachingRadius();
      this.projectLatlngs();
      this.getTyphoonPath();
      this.svgPath && this._path.setAttribute('d', this.svgPath);
    },
    _setStyle: function (style: any) {
      L.setOptions(this, style);
      if (this._renderer) {
        this._renderer._updateStyle(this);
      }
      return this;
    },
    _getLatRadius: function (r: number) {
      return (r / 40075017) * 360;
    },
    _getLngRadius: function (lr: number) {
      return lr / Math.cos((Math.PI / 180) * this._latlng.lat);
    },
  });
