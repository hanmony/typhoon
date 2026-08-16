import { Component, Input, SimpleChanges } from '@angular/core';
import { CaseDto } from '../../../domain/case.dto';
import { UtilsService } from '../../case-detail/services/utils.service';
import { NodeType, nodeTypePropertyMap } from '../constant';
import { MilestonesNodeComponent } from './node/node.component';

// type TextCreator = (this: Info, data: CaseDto) => string;
interface Info {
  time: string;
  text: string;
}

@Component({
  selector: 'guide-milestones',
  imports: [MilestonesNodeComponent],
  templateUrl: './milestones.component.html',
  styleUrl: './milestones.component.less',
})
export class MilestonesComponent {
  @Input() data?: CaseDto;
  nodes: Record<NodeType, Info> = {
    generated: { time: '', text: '' },
    'issued-alert': { time: '', text: '' },
    'top-alert': { time: '', text: '' },
    'lift-alert': { time: '', text: '' },
    dissipate: { time: '', text: '' },
  };
  zoom = 1;
  baseWidth = 1070;
  minHeight = 256;
  constructor(private readonly utils: UtilsService) {}
  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.resetNodes();
    }
  }
  setZoom() {
    return new Promise((resolve) => {
      const w = document.documentElement.offsetWidth;
      setTimeout(() => {
        this.zoom = w / 1920;
        resolve(null);
      });
    });
  }
  ngAfterViewInit() {
    this.setZoom();
  }
  resetNodes() {
    if (this.data) {
      Object.entries(this.nodes).forEach(([key, item]) => {
        const itemValue =
          this.data!.values[nodeTypePropertyMap[key as NodeType]]?.value;
        if (itemValue) {
          const [timeString, text] = itemValue.split('，');
          item.time = this.utils.formatTimeString(new Date(timeString));
          item.text = text;
        }
      });
    }
  }
}
