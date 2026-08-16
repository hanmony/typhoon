/**
 * 一般的返回消息
 */
export class CommonRespDto {
  // @ApiProperty({ description: "返回码" })
  code: number = -1;
  // @ApiProperty({ description: "返回消息" })
  message?: string;
}

export interface CommonRespWith<T> {
  code: number;
  message?: string;
  data: T;
}
