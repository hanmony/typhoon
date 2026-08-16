import { SvgCircle, SvgGroup } from './d3.utils';

interface PatrollingStationParams {
  meta: PatrollingType.Station;
  radius: number;
  stationGroup: SvgGroup;
  onClick: (meta: PatrollingType.Station) => void;
}

export class PatrollingStation {
  type: string = 'station';
  meta: PatrollingType.Station;
  radius: number;
  stationGroup: SvgGroup;
  svg?: SvgCircle;

  clickable = false;
  clickHandler: (meta: PatrollingType.Station) => void;

  private readonly hoverFill = '#32A2D3';
  private readonly normalFill = '#dcfce7';

  constructor(p: PatrollingStationParams) {
    this.meta = p.meta;
    this.radius = p.radius;
    this.stationGroup = p.stationGroup;
    this.clickHandler = p.onClick;
  }

  render() {
    this.svg = this.stationGroup
      .append('circle')
      .attr('cx', this.meta.center.x)
      .attr('cy', this.meta.center.y)
      .attr('r', this.radius)
      .attr('fill', this.normalFill);

    this.addHoverEffect(() => this.clickable);
    this.addClickListener();
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

  setVisibility(visible: boolean) {
    this.svg?.classed('hidden', !visible);
  }

  private addHoverEffect(condition: () => boolean) {
    this.svg!.on('mouseover', () => {
      if (condition()) {
        this.svg!.style('fill', this.hoverFill);
      }
    }).on('mouseout', () => {
      if (condition()) {
        this.svg!.style('fill', this.normalFill);
      }
    });
  }
  get direction() {
    return this.meta.direction;
  }
}
