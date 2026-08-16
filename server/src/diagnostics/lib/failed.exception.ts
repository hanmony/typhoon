import { BadRequestException } from "@nestjs/common";

export class FailedException extends BadRequestException {
    constructor(
        public readonly code: number,
        public message: string,
        public readonly extra?: unknown,
    ) {
        super(message);
    }
}
