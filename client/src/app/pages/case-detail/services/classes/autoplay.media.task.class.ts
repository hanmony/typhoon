import { categorizeFilesByName } from '../../../../app.util';
import { ActionAccessoryDto } from '../../../../domain/action.accessory.dto';
import { ActionCategory } from '../../../../domain/action.category';
import { ActionDto } from '../../../../domain/action.dto';
import { ALL_EVENT_LABEL_MAP, LOCAL_EVENT_KEYS_MAP } from '../utils.service';
import { AutoPlayTask, AutoPlayTaskConfig } from './autoplay.task.class';

const microMediaTaskType = ['image', 'video', 'audio'] as const;

export interface MicroMediaTask {
  type: (typeof microMediaTaskType)[number];
  source: string;
  file: ActionAccessoryDto;
  title: string;
}

function getEventSubType(ev: ActionDto) {
  const map = ALL_EVENT_LABEL_MAP.find((item) => item[0] === ev.category);
  if (!map) return '';
  const keyLabel = map[1];
  if (!keyLabel) return '';
  return ev.items[keyLabel] || '';
}
function getLocation(event: ActionDto) {
  let locationStr = '';
  const l1 = event.items['车站'];
  const l2 = event.items['基地/控制中心'];
  const s1 = event.items['区间起始车站'];
  const s2 = event.items['区间终止车站'];
  const y1 = event.items['起始车站'];
  const y2 = event.items['终止车站'];
  if (l1) {
    locationStr = l1;
  } else if (l2) {
    locationStr = l2;
  } else if (s1 && s2) {
    locationStr = [s1, s2].filter(Boolean).join(' - ');
  } else if (y1 || y2) {
    locationStr = [y1, y2].filter(Boolean).join(' - ');
  }
  return locationStr;
}

function getEventMediaTitle(event: ActionDto) {
  if (event.category === ActionCategory.weather) {
    return event.items['等级'] + getEventSubType(event);
  }
  if (event.category === ActionCategory.keynote) {
    return event.items['事件名称'];
  }
  if (LOCAL_EVENT_KEYS_MAP.find((item) => item[1] === event.category)) {
    return `${getEventSubType(event)} (${getLocation(event)}) `;
  }
  return `${getEventSubType(event)}`;
}

export class AutoPlayMediaTask extends AutoPlayTask {
  // dto: ;
  microMediaTasks: MicroMediaTask[] = [];
  constructor(config: AutoPlayTaskConfig) {
    super(config);
    this.setMicroMediaTasks();
  }
  setMicroMediaTasks() {
    this.microMediaTasks = AutoPlayMediaTask.getMicroMediaTasks(this.events);
  }
  static getMicroMediaTasks = (evs: ActionDto[]) => {
    let microMediaTasks: MicroMediaTask[] = [];
    evs.forEach((event) => {
      const { video, image, audio } = categorizeFilesByName(event.accessories);
      Object.entries({ video, image, audio }).forEach(([k, v]) => {
        microMediaTasks = [
          ...microMediaTasks,
          ...v.map(
            (i) =>
              ({
                type: k as (typeof microMediaTaskType)[number],
                source: i.filename,
                ...i,
                file: i,
                title: getEventMediaTitle(event),
              }) as MicroMediaTask,
          ),
        ];
      });
    });
    return microMediaTasks;
  };
  override setDuration() {
    this.duration = 0;
  }
  override run(): void {
    this.service.mediaPlayService.play(this);
  }
  override onTickDone() {}
  override pause(): void {}
  override resume(): void {}
  override finish(): void {
    super.finish();
  }
  override quit(): void {
    super.quit();
  }
}
