import { Injectable } from '@angular/core';
import { Position } from '@turf/turf';
import dayjs from 'dayjs';
import {
  Circle,
  divIcon,
  FeatureGroup,
  LatLngExpression,
  LeafletEvent,
  Map as LeafMap,
  Marker,
  marker,
} from 'leaflet';
import 'proj4leaflet';
import { interval, Subscription } from 'rxjs';
import { ITyphoonState } from '../../case-detail/services/meta';
import { OccEventType } from '../occ.event-bus.model';
import { OccEventBusService } from '../occ.event-bus.service';
import { MapService } from './../../case-detail/services/map.service';
import { OccTyphoonService } from './typhoon.occ.service';

interface Predict {
  landingPoint?: Position;
  landingState?: ITyphoonState;
  overlayState?: ITyphoonState;
}

const radiusMap = [+0, 0, +0, 100, 80, 30, 20, 10];
// prettier-ignore
const weightMap =   [+0, +0, +0, 1, +1,  +2, +2, +2];

@Injectable({
  providedIn: 'root',
})
export class OccLandingService {
  predict?: Predict;

  map!: LeafMap;
  featureGroup = new FeatureGroup([]);
  circle?: Circle;
  alert?: Marker;
  popupBox?: Marker;

  intervalUpdate$ = interval(30000);
  intervalSubscription$?: Subscription;

  mount(map: LeafMap) {
    this.map = map;
    this.map.on('zoomend', this.onMapZoom.bind(this));
    this.featureGroup.addTo(this.map);

    this.intervalSubscription$ = this.intervalUpdate$.subscribe(() => {
      this.updateOverlayAlert();
    });
  }

  constructor(
    private typhoonService: OccTyphoonService,
    private mapService: MapService,
    private occEventBusService: OccEventBusService,
  ) {}
  getTendencyKeyword(s: string) {
    return this.typhoonService.getTendencyKeyword(s);
  }
  effectPredictLanding() {
    const landing = this.typhoonService.findPredictLandingInfo();
    const overlay = this.typhoonService.findPredictOverlayInfo();

    this.predict = {
      landingPoint: landing?.landingPoint,
      landingState: landing?.landingState,
      overlayState: overlay,
    };
    // console.log('predict info: ', this.predict);
    this.renderLoadingPoint();
    this.occEventBusService.dispatch({
      type: OccEventType.UPDATE_LANDING_INFO,
      payload: this.predict,
    });
  }
  tryToEffectPredictLanding() {
    if (!this.mapService.detailBoundaryPolygon) {
      this.mapService.$detailBoundaryPolygonFetched.subscribe(() => {
        this.effectPredictLanding();
      });
    } else {
      this.effectPredictLanding();
    }
  }
  renderLoadingPoint() {
    if (!this.map) return;
    if (this.predict && this.predict.landingPoint) {
      const { landingPoint } = this.predict;
      // if (!this.circle) {
      //   const c = this.getCircle(landingPoint);
      //   this.circle = c;
      //   this.featureGroup.addLayer(c);
      // } else {
      //   this.updateCircle(landingPoint);
      // }
      if (!this.alert) {
        const a = this.getAlertImage(landingPoint);
        this.alert = a;
        this.featureGroup.addLayer(a);
      } else {
        this.updateAlert(landingPoint);
      }
    } else {
      this.removeLandingInfo();
      if (this.popupBox) {
        this.togglePopupBox();
      }
    }
  }
  removeLandingInfo() {
    // if (this.circle) {
    //   this.circle.remove();
    //   this.circle = undefined;
    // }
    if (this.alert) {
      this.alert.remove();
      this.alert = undefined;
    }
  }
  getAlertImage(p: Position) {
    const size = 71;
    const m = marker(p as LatLngExpression, {
      icon: divIcon({
        html: `<div class="w-full h-full flex justify-center items-center relative">
            <div class="alert-pulse">
              <img class="absolute" src="assets/images/map/landing-point-alert-center.png" style="width: ${27}px" alt="alert-image" />
            </div>
          </div>
          `,
        className: 'hover-border',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      }),
    });
    m.on('click', (p) => {
      this.togglePopupBox();
    });
    return m;
  }
  updateAlert(p: Position) {
    this.alert?.setLatLng(p as LatLngExpression);
  }

  // getCircle(p: Position) {
  //   const zoom = this.map!.getZoom();
  //   const radius = this.getRadius(zoom);
  //   const weight = this.getWeight(zoom);
  //   return circle(p as LatLngExpression, {
  //     color: '#862255',
  //     fillColor: '#862255',
  //     fillOpacity: 1,
  //     weight: weight,
  //     stroke: !!weight,
  //     radius: radius,
  //   });
  // }
  // updateCircle(p: Position) {
  //   this.circle?.setLatLng(p as LatLngExpression);
  // }

  getRadius(zoom = 10) {
    const minZoom = 9;
    return radiusMap[zoom - minZoom] || 0;
  }
  getWeight(zoom = 10) {
    const minZoom = 9;
    return weightMap[zoom - minZoom] || 0;
  }
  onMapZoom(event: LeafletEvent) {
    const zoom = this.map!.getZoom();
    // if (this.circle) {
    //   this.circle.setRadius(this.getRadius(zoom));
    //   const weight = this.getWeight(zoom);
    //   this.circle.setStyle({
    //     color: '#862255',
    //     fillColor: '#862255',
    //     fillOpacity: 1,
    //     weight,
    //     stroke: !!weight,
    //   });
    // }
  }
  togglePopupBox() {
    if (this.popupBox) {
      this.popupBox.remove();
      this.popupBox = undefined;
    } else {
      if (!this.predict?.landingState) return;
      this.popupBox = this.getLandingPopUpBox(
        this.predict!.landingPoint!,
        this.predict!.landingState!,
      );
      this.featureGroup.addLayer(this.popupBox);
    }
  }
  getLandingPopUpBox(landingPoint: Position, landingState: ITyphoonState) {
    const width = 266;
    const height = 110;
    const overlayAlert = this.getOverlayBoxAlertHtml();

    return marker(landingPoint as LatLngExpression, {
      icon: divIcon({
        html: `<div class="w-full h-full relative text-base animate__animated animate__zoomInLeft"
          style="background: url(assets/images/map/landing-alert-box.png) no-repeat center center; background-size: 100% 100%; padding: 6px 0 0 12px"
        >
          <div  style="padding-left: 4px; line-height: 32px; font-size: 16px">台风预计登陆地点</div>
          <div class="flex"  style="padding-left: 16px; line-height: 32px; font-size: 14px">
            <div>预计登陆时间：</div>
            <div style="color: #FFBA00;">${landingState.timeString}</div>
          </div>
          <div id="overlayAlert" class="flex" style="padding-left: 16px; line-height: 36px; font-size: 14px">
              ${overlayAlert}
            </div>
        </div>
          `,
        className: 'hover-border',
        iconSize: [width, height],
        iconAnchor: [-71 / 2, height / 2],
      }),
    });
  }
  getOverlayDiffDurationText() {
    const state = this.predict?.overlayState;
    if (!state) return '';
    const time = this.predict!.overlayState!.time;
    const seconds = dayjs(time).diff(dayjs(), 'second');
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const hourText = hours > 0 ? `${hours}小时` : '';
    const minuteText = minutes > 0 ? `${minutes}分钟` : '';
    return {
      overlaid: minutes <= 0,
      text: `${hourText}${minuteText}`,
    };
  }
  getOverlayBoxAlertHtml() {
    const overlayTimeDiff = this.getOverlayDiffDurationText();
    if (!overlayTimeDiff) return '';
    const { text: overlayTimeDiffText, overlaid } = overlayTimeDiff;
    if (overlaid) {
      return `<div>风圈正在影响上海</div>`;
    }
    return overlayTimeDiffText
      ? `<div>风圈预计影响上海：</div>
          <div style="color: #FFBA00;">${overlayTimeDiffText}后</div>`
      : '';
  }
  updateOverlayAlert() {
    if (this.popupBox) {
      const wrapper = document.querySelector('#overlayAlert');
      if (wrapper) {
        const html = this.getOverlayBoxAlertHtml();
        wrapper.innerHTML = html;
      }
    }
  }
}

@Injectable({
  providedIn: 'root',
})
export class DashboardLandingService extends OccLandingService {}
