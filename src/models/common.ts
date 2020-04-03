import { EventType, ResponseEvent } from "./events";

export interface KeyValueList<TId, TValue> extends Array<KeyValuePair<TId, TValue>> { }

export type KeyValuePair<TId, TValue> = {
    id: TId
    value: TValue
}

export class GameError extends Error {

    errorCode: GameErrorCode

    constructor(errorCode: GameErrorCode, message: string) {
        super(message);
        this.name = "GameError";
        this.errorCode = errorCode
    }

    toEvent(): GameErrorEvent {
        let e: GameErrorEvent = {
            sessionId: null,
            type: EventType.ERROR,
            errorCode: this.errorCode,
            message: this.message
        }
        return e
    }
}

export enum GameErrorCode {
    NOT_SESSION_OWNER = "NOT_SESSION_OWNER",
    ROOM_NOT_FOUND = "ROOM_NOT_FOUND",
    TEAM_NOT_FOUND = "TEAM_NOT_FOUND",
    INVALID_SESSION_ID = "INVALID_SESSION_ID",
    GAME_NOT_STARTED = "GAME_NOT_STARTED",
    GAME_ALREADY_STARTED = "GAME_ALREADY_STARTED",
    GAME_FINISHED = "GAME_FINISHED",
    QUESTION_ALREADY_ANSWERED = "QUESTION_ALREADY_ANSWERED",
    QUESTION_EXPIRED = "QUESTION_EXPIRED",
    INVALID_ANSWER_ID = "INVALID_ANSWER_ID",
}

export interface GameErrorEvent extends ResponseEvent {
    type: EventType.ERROR
    errorCode: GameErrorCode
    message: string
}