import { RoundSchema, Question } from "./schemas"
import { KeyValueList } from "./common"

export interface Event {
    type: EventType
    sessionId?: string
}

export interface SessionEvent extends Event {
    sessionId: string
}

export interface ResponseEvent extends SessionEvent { }

export enum EventType {
    ERROR = "ERROR",

    PING = "PING",
    PING_ALL = "PING_ALL",

    CREATE_ROOM = "CREATE_ROOM",
    ROOM_CREATED = "ROOM_CREATED",

    LEAVE_ROOM = "LEAVE_ROOM",
    ROOM_LEFT = "ROOM_LEFT",

    JOIN_ROOM = "JOIN_ROOM",
    ROOM_JOINED = "ROOM_JOINED",

    REJOIN_ROOM_HOST = "REJOIN_ROOM_HOST",
    ROOM_HOST_REJOINED = "ROOM_HOST_REJOINED",

    REJOIN_ROOM = "REJOIN_ROOM",
    ROOM_REJOINED = "ROOM_REJOINED",

    START_GAME = "START_GAME",
    GAME_STARTED = "GAME_STARTED",

    FINISH_GAME = "FINISH_GAME",
    GAME_FINISHED = "GAME_FINISHED",

    PUBLISH_NEXT_QUESTION = "PUBLISH_NEXT_QUESTION",
    QUESTION_PUBLISHED = "QUESTION_PUBLISHED",

    SUBMIT_ANSWER = "SUBMIT_ANSWER",
    ANSWER_SUBMITTED = "ANSWER_SUBMITTED"
}

export interface CreateRoomEvent extends Event {
    rounds: Array<CreateRound>
}

export type CreateRound = {
    categoryId: number
    numOfQuestions: number
}

export interface RoomCreatedEvent extends ResponseEvent {
    roomId: string
    rounds: Array<RoundSchema>
}

export interface JoinRoomEvent extends Event {
    roomId: string
    teamName: string
}

export interface RoomJoinedEvent extends ResponseEvent {
    teamName: string
    teamId: string
}

export interface RejoinRoomEvent extends SessionEvent {
    roomId: string
    teamId?: string
}

export interface RoomRejoinedEvent extends RoomCreatedEvent, GameFinishedEvent {
    gameStarted: boolean
}

export interface StartGameEvent extends SessionEvent { }

export interface FinishGameEvent extends SessionEvent { }

export interface GameStartedEvent extends ResponseEvent { }

export interface GameFinishedEvent extends ResponseEvent {
    scores: Array<TeamScore>
}

export interface TeamScore {
    teamId: string
    teamName: string
    score: number
}

export interface PublishNextQuestionEvent extends SessionEvent {
    lastRoundNumber?: number
    lastQuestionNumber?: number
}

export interface QuestionPublishedEvent extends ResponseEvent {
    question: Question
    roundNumber: number
    questionNumber: number
    expiresInSeconds: number
    isLastQuestion?: boolean
}

export interface SubmitAnswerEvent extends SessionEvent {
    teamId: string
    questionId: string
    answerId: string
}

export interface AnswerSubmittedEvent extends ResponseEvent {
    teamName: string
    teamId: string
    questionId: string
    answerId: string
    hostConnectionId: string
}