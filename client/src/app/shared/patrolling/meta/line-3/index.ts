import {
  convertOrderToPath,
  mixinConnectionProperties,
  mixinCorrectConnectionOnPath,
} from '../../patrolling.utils';
import corners from './corners';
import baseConnections from './main';
import baseOrders from './order';
import preset from './preset';
import stations from './stations';

const mixinConnections = mixinConnectionProperties(baseConnections, stations);

const manualMixinConnections = mixinConnections.map((c) => {
  if (c.to === '张华浜站:up' && !c.from) {
    return {
      ...c,
      from: '淞发路站:up',
    };
  }
  if (c.from === '张华浜站:down' && !c.to) {
    return {
      ...c,
      to: '淞发路站:down',
    };
  }
  return c;
});

const basepath = convertOrderToPath(baseOrders);
const combinedPath = mixinCorrectConnectionOnPath(
  basepath,
  manualMixinConnections,
);

const line3Meta: PatrollingType.LineMeta = {
  name: '3号线',
  preset,
  connections: manualMixinConnections,
  stations,
  corners,
  lineWidth: 5,
  presetCombinedTopologyPath: combinedPath,
};
export default line3Meta;
