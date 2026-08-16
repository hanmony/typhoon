export type Svg = d3.Selection<SVGSVGElement, unknown, null, undefined>;
export type SvgCircle = d3.Selection<
  SVGCircleElement,
  unknown,
  null,
  undefined
>;
export type SvgGroup = d3.Selection<SVGGElement, unknown, null, undefined>;

export type SvgGroupUndefined = d3.Selection<
  SVGGElement,
  undefined,
  null,
  undefined
>;

export type SvgPolyline = d3.Selection<
  SVGPolylineElement,
  unknown,
  null,
  undefined
>;

export type SvgPolylines = d3.Selection<
  d3.BaseType | SVGPolylineElement,
  any,
  SVGGElement,
  unknown
>;
