export class LogListReqDto {
  page: number = 1; // 页码
  pageSize: number = 10; // 每页数量

  user?: string = '';
  name?: string = '';
  dept?: string = '';
  job?: string = '';
  module?: string = '';
  title?: string = '';
  url?: string = '';
  ip?: string = '';
  useragent?: string = '';
  request?: string = '';
  response?: string = '';
  period‌?: Date[] = [];

  sortPath?: string; // 排序字段
  sortType?: string; // 排序方法
}
