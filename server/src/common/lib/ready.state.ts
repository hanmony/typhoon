import { Logger } from "@nestjs/common";
import { waitUntil } from "./util";

export class ReadyState {
    private _ready = false;

    public get ready() {
        return this._ready;
    }

    public set ready(value: boolean) {
        this._ready = value;
    }

    public async waitForReady(host: string) {
        logger.log("wait for ready start", host);
        await waitUntil(() => this._ready);
        logger.log("wait for ready end", host);
        return;
    }
}

const logger = new Logger(ReadyState.name);
