export type NodeType =
  | 'generated'
  | 'issued-alert'
  | 'top-alert'
  | 'lift-alert'
  | 'dissipate';

export const nodeTypePropertyMap: Record<NodeType, string> = {
  generated: '台风生成时间',
  'issued-alert': '预警发布时间',
  'top-alert': '最高预警时间',
  'lift-alert': '预警解除时间',
  dissipate: '台风消散时间',
};

export const milestoneIds: NodeType[] = [
  'generated',
  'issued-alert',
  'top-alert',
  'lift-alert',
  'dissipate',
];

export const overviewIds = [
  'overview-effects',
  'overview-measures',
  'overview-publicOpinions',
] as const;

export const nodeTypeImageMap: Record<NodeType, string> = {
  generated: 'assets/images/guide/generated-icon.png',
  'issued-alert': 'assets/images/guide/issued-alert-icon.png',
  'top-alert': 'assets/images/guide/top-alert-icon.png',
  'lift-alert': 'assets/images/guide/lift-alert-icon.png',
  dissipate: 'assets/images/guide/dissipate-icon.png',
};

export type GetAnimationParams = Record<NodeType, (() => void) | undefined>;
