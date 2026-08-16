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

const line1Meta: PatrollingType.LineMeta = {
  name: '4号线',
  preset,
  connections: mixinConnections,
  stations,
  corners,
  lineWidth: 4.6265,
  presetCombinedTopologyPath: combinedPath,
  proximityPrinciple: true, // 就近原则， 四号线是个环
};
export default line1Meta;
