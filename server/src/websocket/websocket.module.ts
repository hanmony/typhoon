import { Module } from "@nestjs/common";
import { TyphoonWebSocketGateway } from "./gateway/websocket.gateway";
import { WebSocketService } from "./service/websocket.service";

@Module({
    providers: [TyphoonWebSocketGateway, WebSocketService],
    exports: [WebSocketService],
})
export class WebSocketModule {}
