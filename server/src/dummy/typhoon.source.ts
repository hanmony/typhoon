import Bebinca from './typhoon.source.bebinca';
import Muifa from './typhoon.source.muifa';
import Mock from './typhoon.source.virtually';

export const DUMMY_TYPHOON_SOURCE = {
  Muifa,
  Bebinca,
};

export const DUMMY_TYPHOON_STEPS = {
  Muifa: [],
  Bebinca: [],
  Mock: [
    '2025-11-05 16:59:00',
    '2025-11-06 07:59:00',
    '2025-11-07 02:00:00',
    '2025-11-07 14:00:00',
  ],
};

export const DUMMY_TYPHOON_SIMULATE_START = {
  Muifa: '2022-09-14 08:00:00',
  // Muifa: '2022-09-14 19:00:00',
  Bebinca: '2024-09-16 07:00:00',
  Mock: '2025-11-01 23:00:00',
};
export const DUMMY_TYPHOON_MAP = {
  模拟: {
    source: Mock,
    simulateStartTime: DUMMY_TYPHOON_SIMULATE_START.Mock,
    steps: DUMMY_TYPHOON_STEPS.Mock,
  },
  梅花: {
    source: DUMMY_TYPHOON_SOURCE.Muifa,
    simulateStartTime: DUMMY_TYPHOON_SIMULATE_START.Muifa,
    steps: DUMMY_TYPHOON_STEPS.Muifa,
  },
  贝碧嘉: {
    source: DUMMY_TYPHOON_SOURCE.Bebinca,
    simulateStartTime: DUMMY_TYPHOON_SIMULATE_START.Bebinca,
    steps: DUMMY_TYPHOON_STEPS.Bebinca,
  },
};

export const getDummyTyphoonSource = (name: string) => {
  return DUMMY_TYPHOON_MAP[name]?.source || DUMMY_TYPHOON_SOURCE.Muifa;
};

export const getDummyTyphoonSimulateStartTime = (name: string) => {
  return (
    DUMMY_TYPHOON_MAP[name]?.simulateStartTime ||
    DUMMY_TYPHOON_SIMULATE_START.Muifa
  );
};

export const getDummyTyphoonSteps = (name: string) => {
  return DUMMY_TYPHOON_MAP[name]?.steps || DUMMY_TYPHOON_STEPS.Muifa;
};
