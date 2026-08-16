import { Component, Input } from '@angular/core';
import { NodeType, nodeTypeImageMap } from '../../constant';

@Component({
  selector: 'milestones-node',
  imports: [],
  templateUrl: './node.component.html',
  styleUrl: './node.component.less',
  host: {
    class: 'inline-flex flex-col justify-center items-center',
  },
})
export class MilestonesNodeComponent {
  @Input() type: NodeType = 'generated';
  @Input() time: string = '';
  @Input() text: string = '';

  get image() {
    return nodeTypeImageMap[this.type];
  }
  get widthAuto() {
    return ['issued-alert', 'top-alert', 'dissipate'].includes(this.type);
  }
  get heightAuto() {
    return ['generated', 'lift-alert'].includes(this.type);
  }
}
