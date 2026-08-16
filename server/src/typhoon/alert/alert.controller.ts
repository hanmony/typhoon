import { Controller, Get, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { AlertService } from "./alert.service";
import { AlertCurrentResponseDto } from "./dto/alert.dto";

@ApiTags("告警")
@Controller("typhoon/alert")
export class AlertController {
    private readonly logger = new Logger(AlertController.name);

    constructor(private readonly alertService: AlertService) {}

    @Get("current")
    @ApiOperation({ summary: "获取当前告警状态" })
    async getCurrentAlerts(): Promise<AlertCurrentResponseDto> {
        return this.alertService.getCurrentAlerts();
    }
}
