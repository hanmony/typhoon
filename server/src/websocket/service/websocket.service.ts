import { Injectable, Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";

@Injectable()
export class WebSocketService {
    private readonly logger = new Logger(WebSocketService.name);
    private server: Server;
    private clients: Set<Socket> = new Set();

    setServer(server: Server) {
        this.server = server;
    }

    addClient(client: Socket) {
        this.clients.add(client);
        this.logger.log(`Total connected clients: ${this.clients.size}`);
    }

    removeClient(client: Socket) {
        this.clients.delete(client);
        this.logger.log(`Total connected clients: ${this.clients.size}`);
    }

    broadcastMessage(event: string, message: string) {
        if (!this.server) {
            this.logger.warn("WebSocket server not initialized");
            return;
        }

        this.logger.log(`Broadcasting message to ${this.clients.size} clients: ${message}`);
        this.server.emit(event, message);
    }

    broadcastToAll(message: string) {
        this.broadcastMessage("notification", message);
    }

    broadcastEmergencyResponseUpdate() {
        // const message = `应急响应已更新 - 市级: ${municipalDegree}, 公司级: ${corporateDegree}`;
        // this.broadcastToAll(message);
        this.broadcastToAll("updateEmergencyResponse");
    }
    broadcastSimulateStartTimeUpdate() {
        this.broadcastToAll("updateSimulateStartTime");
    }
}
