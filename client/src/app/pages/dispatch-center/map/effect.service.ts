import { Injectable } from '@angular/core';
import { FeatureGroup, Map, Marker } from 'leaflet';

import 'proj4leaflet';

@Injectable({
  providedIn: 'root',
})
export class MapEffectService<T> {
  map!: Map;
  featureGroup = new FeatureGroup([]);
  dataWithMarker: { data: T; marker: Marker }[] = [];
  remoteDistinctZoom = 12;
  isRemote = true;

  localPopUpBox?: { data: T; marker: Marker };

  constructor() {}
  mount(map: Map) {
    this.map = map;
    this.map.addEventListener('click', (p) => {
      // const userTeam = {
      //   id: '1',
      //   pending: Math.floor(Math.random() * 301),
      //   doing: Math.floor(Math.random() * 201),
      //   position: [p.latlng.lat, p.latlng.lng] as LatLngExpression,
      // };
      // const marker = this.getRemoteMarker(userTeam);
      // this.layerGroup.addLayer(marker);
      // this.teamsWithMarker.push({ team: userTeam, marker });
    });
    this.featureGroup.addTo(this.map);
    // this.featureGroup.on('click', (p) => {
    // });
  }
  effectWithZoom() {
    if (!this.dataWithMarker.length) return;
    const zoom = this.map.getZoom();
    const currentIsRemote = zoom < this.remoteDistinctZoom;
    if (this.isRemote !== currentIsRemote) {
      this.showEffect();
    }
  }
  removeLocalPopUpBox() {
    if (this.localPopUpBox?.data) {
      this.localPopUpBox.marker.remove();
      this.localPopUpBox = undefined;
    }
  }
  showEffect() {
    const zoom = this.map.getZoom();
    this.isRemote = zoom < this.remoteDistinctZoom;
    this.clearEffect();
    if (this.isRemote) {
      this.renderRemoteMarkers();
    } else {
      this.renderLocalMarkers();
    }
  }
  renderLocalMarkers() {
    throw new Error('Not implemented');
  }

  clearMakers() {
    this.featureGroup.clearLayers();
    this.dataWithMarker = [];
  }
  clearEffect() {
    this.clearMakers();
    this.removeLocalPopUpBox();
  }
  renderRemoteMarkers() {
    throw new Error('Not implemented');
  }
  getRemoteMarker(data: T) {
    throw new Error('Not implemented');
  }
  getLocalMarker(data: T) {
    throw new Error('Not implemented');
  }
  toggleLocalPopUpBox(data: T) {
    if (this.localPopUpBox?.data) {
      if (this.localPopUpBox?.data !== data) {
        this.removeLocalPopUpBox();
        this.renderLocalPopUpBox(data);
        return;
      }
      this.removeLocalPopUpBox();
      return;
    }
    this.renderLocalPopUpBox(data);
  }
  renderLocalPopUpBox(data: T) {
    throw new Error('Not implemented');
  }
}
