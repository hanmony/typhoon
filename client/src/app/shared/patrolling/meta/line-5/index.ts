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

const basepath = convertOrderToPath(baseOrders);
const combinedPath = mixinCorrectConnectionOnPath(basepath, mixinConnections);

const line5Meta: PatrollingType.LineMeta = {
  name: '5号线',
  preset,
  connections: mixinConnections,
  stations,
  corners,
  lineWidth: 4.6265,
  presetCombinedTopologyPath: combinedPath,
};
export default line5Meta;
