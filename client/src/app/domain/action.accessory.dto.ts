export class ActionAccessoryDto {
  // @ApiProperty({ description: "文件名" })
  filename: string = '';

  // @ApiProperty({ description: "原始文件名" })
  originName: string = '';

  // @ApiProperty({ description: "文件类型" })
  contentType: string = '';

  // @ApiProperty({ description: "文件上传日期" })
  createdAt: Date = new Date();
}
