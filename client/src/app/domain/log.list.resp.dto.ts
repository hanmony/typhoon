import { LogDto } from "./log.dto";

export class LogListRespDto {
  list: LogDto[] = []; // 员工列表
  total: number = 0; // 员工总数
}
