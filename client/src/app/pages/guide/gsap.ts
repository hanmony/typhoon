import gsap from 'gsap';
import { GetAnimationParams, milestoneIds, overviewIds } from './constant';

export const getAnimation = (getAnimationParams: GetAnimationParams) => {
  const tl = gsap.timeline({ repeat: 0 });
  tl.to('#guide-headline', {
    x: 0,
    duration: 2,
    opacity: 1,
  });

  milestoneIds.forEach((id) => {
    tl.to(`#${id}-node`, {
      y: 0,
      duration: 2,
      opacity: 1,
      onComplete: () => {
        const callback = getAnimationParams[id];
        if (callback) {
          callback();
        }
      },
    });
  });
  overviewIds.forEach((id) => {
    tl.to(`#${id}-title`, {
      y: 0,
      duration: 1,
      opacity: 1,
    });
    tl.to(`#${id}-infos`, {
      x: 0,
      duration: 1,
      opacity: 1,
    });
  });
  return tl;
};
