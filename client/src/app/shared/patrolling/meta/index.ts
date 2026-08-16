import line1Meta from './line-1';
import line10Meta from './line-10';
import line11Meta from './line-11';
import line12Meta from './line-12';
import line13Meta from './line-13';
import line14Meta from './line-14';
import line15Meta from './line-15';
import line16Meta from './line-16';
import line17Meta from './line-17';
import line18Meta from './line-18';
import line2Meta from './line-2';
import line3Meta from './line-3';
import line4Meta from './line-4';
import line5Meta from './line-5';
import line6Meta from './line-6';
import line7Meta from './line-7';
import line8Meta from './line-8';
import line9Meta from './line-9';

const lineMetaMap: Record<string, PatrollingType.LineMeta> = {
  '1号线': line1Meta,
  '2号线': line2Meta,
  '3号线': line3Meta,
  '4号线': line4Meta,
  '5号线': line5Meta,
  '6号线': line6Meta,
  '7号线': line7Meta,
  '8号线': line8Meta,
  '9号线': line9Meta,
  '10号线': line10Meta,
  '11号线': line11Meta,
  '12号线': line12Meta,
  '13号线': line13Meta,
  '14号线': line14Meta,
  '15号线': line15Meta,
  '16号线': line16Meta,
  '17号线': line17Meta,
  '18号线': line18Meta,
};

export const getLineMetaByLineName = (lineName: string) => {
  return lineMetaMap[lineName] as PatrollingType.LineMeta;
};

export default lineMetaMap;
