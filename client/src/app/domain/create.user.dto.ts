export class CreateUserDto {
  // @ApiProperty({ description: "Username" })
  username: string = '';
  // @ApiProperty({ description: "Nickname" })
  nickname: string = '';
  // @ApiProperty({ description: "roles" })
  roles: string[] = [];
  department: string = '';
}
