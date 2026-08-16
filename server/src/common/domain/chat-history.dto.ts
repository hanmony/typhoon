import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, MaxLength } from "class-validator";

export class ChatHistoryItem {
    @ApiProperty({ enum: ["user", "assistant"] })
    @IsIn(["user", "assistant"])
    role: "user" | "assistant";

    @ApiProperty()
    @IsString()
    @MaxLength(2000)
    content: string;
}
