import { Logger } from "@nestjs/common";
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketGateway as WSWebSocketGateway,
    WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { WebSocketService } from "../service/websocket.service";

@WSWebSocketGateway({
    cors: {
        origin: "*",
    },
})
export class TyphoonWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(TyphoonWebSocketGateway.name);

    @WebSocketServer()
    server: Server;

    constructor(private readonly webSocketService: WebSocketService) {}

    afterInit(server: Server) {
        this.webSocketService.setServer(server);
        this.logger.log("WebSocket Gateway initialized");
    }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
        this.webSocketService.addClient(client);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        this.webSocketService.removeClient(client);
    }
}
