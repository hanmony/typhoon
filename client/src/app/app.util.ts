import { ActionAccessoryDto } from './domain/action.accessory.dto';

export async function waitForSeconds(seconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, seconds * 1000);
  });
}

export function getRoleName(role: string) {
  switch (role) {
    case 'admin':
      return '超管';
    case 'groupManager':
      return '集团管理员';
    case 'emergencyManager':
      return '应急指挥员';
    case 'coccManager':
      return 'COCC管理员';
    case 'occManager':
      return 'OCC管理员';
    case 'manager':
      return '管理员';
    case 'editor':
      return '编辑';
    case 'user':
      return '普通用户';
    default:
      return '未知角色';
  }
}

export function getSelectRoles(): {
  value: string;
  label: string;
}[] {
  return [
    { value: 'groupManager', label: '集团管理员' },
    { value: 'emergencyManager', label: '应急指挥员' },
    { value: 'coccManager', label: 'COCC管理员' },
    { value: 'occManager', label: 'OCC管理员' },
    { value: 'manager', label: '管理员' },
    { value: 'editor', label: '编辑' },
    { value: 'user', label: '普通用户' },
  ];
}

export function getSelectLines(): {
  value: string;
  label: string;
}[] {
  return [
    { value: '1号线', label: '1号线' },
    { value: '2号线', label: '2号线' },
    { value: '3号线', label: '3号线' },
    { value: '4号线', label: '4号线' },
    { value: '5号线', label: '5号线' },
    { value: '6号线', label: '6号线' },
    { value: '7号线', label: '7号线' },
    { value: '8号线', label: '8号线' },
    { value: '9号线', label: '9号线' },
    { value: '10号线', label: '10号线' },
    { value: '11号线', label: '11号线' },
    { value: '12号线', label: '12号线' },
    { value: '13号线', label: '13号线' },
    { value: '14号线', label: '14号线' },
    { value: '15号线', label: '15号线' },
    { value: '16号线', label: '16号线' },
    { value: '17号线', label: '17号线' },
    { value: '18号线', label: '18号线' },
    { value: '机场联络线', label: '机场联络线' },
    { value: '浦江线', label: '浦江线' },
    { value: '全线', label: '全线' },
  ];
}

export const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^]{8,16}$/;

interface FileEntity extends ActionAccessoryDto {}

/**
 * Categorize an array of files into image, document, video, or other categories.
 *
 * @param {FileEntity[]} fileEntities - The array of FileEntity to categorize.
 * @return {Record<string, FileEntity[]>} An object containing keys "image", "document", "video", and "other", each with an array of corresponding files.
 */

export function categorizeFilesByName(
  fileEntities: FileEntity[],
): Record<string, FileEntity[]> {
  const categories: Record<string, FileEntity[]> = {
    image: [],
    video: [],
    audio: [],
    doc: [],
    other: [],
  };
  if (!fileEntities) return categories;

  // const imageExtensions = /\.(jpe?g|png|gif|svg|bpm|tiff|webp)$/i
  const imageExtensions = /\.(jpe?g|png|gif|svg|bpm|webp)$/i;
  // const videoExtensions = /\.(mp4|avi|mov|wmv|mkv|webm|mpg)$/i
  const videoExtensions = /\.(mp4|webm)$/i;
  // const audioExtensions = /\.(mp3|wav|aac|flac|m4a|ape|opus)$/i
  const audioExtensions = /\.(mp3|wav|ogg)$/i;
  const docExtensions = /\.(docx?|pdf|xlsx?|txt|ppt?x|csv|xml|md)$/i;

  fileEntities.forEach((fileEntity) => {
    if (!fileEntity) return;
    const { originName } = fileEntity;
    if (imageExtensions.test(originName)) {
      categories['image'].push(fileEntity);
    } else if (videoExtensions.test(originName)) {
      categories['video'].push(fileEntity);
    } else if (audioExtensions.test(originName)) {
      categories['audio'].push(fileEntity);
    } else if (docExtensions.test(originName)) {
      categories['doc'].push(fileEntity);
    } else {
      categories['other'].push(fileEntity);
    }
  });
  return categories;
}

export function checkUserAgent() {
  // 获取 User-Agent 字符串
  const userAgent = window.navigator.userAgent;
  // 判断是否是安卓
  const isAndroid = /Android/i.test(userAgent);
  // 判断是否是 iPad
  const isIPad = /iPad/i.test(userAgent);
  // 判断是否是手机
  const isMobile = /Mobile/i.test(userAgent);
  // 判断是否是平板电脑
  const isTablet = /Tablet/i.test(userAgent);
  return {
    isMobile,
    isAndroidTablet: isAndroid && isTablet,
    isPC: !isMobile && !isTablet && !isIPad,
  };
}

/**
 * 获取元素的 css3 Translate 偏移量
 * 只做了对标准和 webkit 内核兼容
 * 获取css属性摘自 Zepto.js，做修改后只获得 transform 属性
 * 只处理 translate，如果有旋转或者缩放等，结果会不准确
 *
 * @param  {Object} element dom元素
 * @return {Array}          偏移量[x,y]
 */
function getTranslate(element: HTMLElement) {
  var transformMatrix =
    // @ts-ignore
    element.style['WebkitTransform'] ||
    getComputedStyle(element, '').getPropertyValue('-webkit-transform') ||
    element.style['transform'] ||
    getComputedStyle(element, '').getPropertyValue('transform');

  var matrix = transformMatrix.match(/\-?[0-9]+\.?[0-9]*/g);

  if (!matrix) return [0, 0];
  var x = parseInt(matrix[0] || 0); //translate x
  var y = parseInt(matrix[2] || 0); //translate y
  return [Number(x), Number(y)];
}

export function calculateDistanceToHtml(element: HTMLElement): {
  top: number;
  left: number;
} {
  let top = 0;
  let left = 0;
  let currentElement: HTMLElement | null = element;

  while (currentElement) {
    top += currentElement.offsetTop;
    left += currentElement.offsetLeft;
    currentElement = currentElement.offsetParent as HTMLElement;
  }

  const [x, y] = getTranslate(findAncestorWithAttribute(element, 'translate'));
  return { top: top + y, left: left + x };
}

export function calculateDistanceToTarget(
  element: HTMLElement,
  targetProp: string,
): {
  top: number;
  left: number;
} {
  let top = 0;
  let left = 0;
  let currentElement: HTMLElement | null = element;

  while (currentElement) {
    top += currentElement.offsetTop;
    left += currentElement.offsetLeft;
    currentElement = currentElement.offsetParent as HTMLElement;
    if (currentElement.hasAttribute(targetProp)) {
      break;
    }
  }

  const [x, y] = getTranslate(findAncestorWithAttribute(element, 'translate'));
  return { top: top + y, left: left + x };
}

export function findAncestorWithAttribute(
  element: HTMLElement,
  prop: string,
): HTMLElement {
  let currentElement: HTMLElement | null = element;
  while (currentElement) {
    if (currentElement.hasAttribute(prop)) {
      return currentElement;
    }
    currentElement = currentElement.parentElement;
  }

  return element;
}
