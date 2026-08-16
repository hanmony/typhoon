import { SvgGroup } from './d3.utils';

interface PatrollingStationParams {
  meta: PatrollingType.Corner;
  radius: number;
  cornerGroup: SvgGroup;
  onClick: (meta: PatrollingType.Corner) => void;
}

export class PatrollingCorner {
  meta: PatrollingType.Corner;
  radius: number;
  cornerGroup: SvgGroup;
  svg?: SvgGroup;

  clickable = false;
  clickHandler: (meta: PatrollingType.Corner) => void;

  private readonly hoverFill = '#32A2D3';
  private readonly normalFill = '#468F54';

  constructor(p: PatrollingStationParams) {
    this.meta = p.meta;
    this.radius = p.radius;
    this.cornerGroup = p.cornerGroup;
    this.clickHandler = p.onClick;
  }

  render() {
    this.svg = this.cornerGroup
      .append('g')
      .attr('class', 'hidden')
      .attr('from', this.meta.from)
      .attr('to', this.meta.to)
      .attr(
        'transform',
        `translate(${this.meta.center.x}, ${this.meta.center.y})`,
      );
    // .attr('belong', this.meta.beLongFull);
    // stroke-width:1.1844;stroke-miterlimit:10;
    this.svg
      .append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', this.radius)
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 1.1844)
      .attr('stroke-miterlimit', 10)
      .attr('fill', this.normalFill);

    this.svg
      .append('path')
      .attr(
        'd',
        `M0,2.9 c-0.2,0-0.5-0.1-0.6-0.3 l-1.8-1.9 c-0.2-0.2-0.3-0.5-0.1-0.8 c0.1-0.2,0.3-0.4,0.6-0.4 h0.4v-1.5 c0-0.6,0.4-1,0.9-1 h1.3c0.5,0,0.9,0.5,0.9,1 v1.5h0.4 c0.2,0,0.5,0.2,0.6,0.4 c0.1,0.3,0.1,0.6-0.1,0.8 l-1.8,1.9 C0.5,2.8,0.2,2.9,0,2.9z M-2,0.2 c0,0,0,0.1,0,0 l1.8,1.9 c0.1,0.1,0.1,0.1,0.2,0.1 l0,0 c0.1,0,0.1,0,0.2-0.1 l1.8-1.9 c0,0,0-0.1,0-0.1 h-0.7 c-0.2,0-0.3-0.1-0.3-0.3 v-1.8 c0-0.2-0.1-0.4-0.3-0.4 h-1.4 c-0.2,0-0.3,0.2-0.3,0.4 v1.8 c0,0.2-0.1,0.3-0.3,0.3 C-1.3,0.2-2,0.2-2,0.2z`,
      )
      .attr('fill', '#FFFFFF')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 6.579892e-2)
      .attr('stroke-miterlimit', 10);

    this.addHoverEffect(() => this.clickable);
    this.addClickListener();
  }

  setVisibility(visible: boolean) {
    this.svg?.classed('hidden', !visible);
  }
  setClickable(clickable: boolean) {
    this.clickable = clickable;
    this.svg?.classed('cursor-pointer', clickable);
  }

  addClickListener() {
    this.svg!.on('click', () => {
      if (this.clickable) {
        this.clickHandler(this.meta);
      }
    });
  }
  private addHoverEffect(condition: () => boolean) {
    this.svg!.on('mouseover', () => {
      if (condition()) {
        this.svg!.select('circle').style('fill', this.hoverFill);
      }
    }).on('mouseout', () => {
      if (condition()) {
        this.svg!.select('circle').style('fill', this.normalFill);
      }
    });
  }
  get direction() {
    return this.meta.direction;
  }
}
