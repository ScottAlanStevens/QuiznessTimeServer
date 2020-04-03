import { CreateRoomEvent, RoomCreatedEvent, CreateRound, EventType, StartGameEvent, GameStartedEvent, PublishNextQuestionEvent, QuestionPublishedEvent, GameFinishedEvent, SessionEvent, FinishGameEvent, TeamScore, RejoinRoomEvent, RoomRejoinedEvent, RoomJoinedEvent } from "../models/events"
import { v4 as uuid } from 'uuid'
import { RoundSchema, RoomSchema, TeamSchema, Question } from "../models/schemas"
// import { putItemAsync } from "../lib/dynamo"
import { generateRoundAsync } from "./openTrivia"
import { _getRoomBySessionIdAsync, _getTeamAsync, _getTeamsAsync, _updateRoomAsync, _getRoomByRoomIdAsync } from "../lib/data"
import { GameError, GameErrorCode } from "../models/common"
import { broadcastMessageAsync } from "../transport"

const ROOM_ID_LENGTH: number = 4
const QUESTION_EXPIRES_IN_SECONDS: number = 10

export const createRoomAsync = async (event: CreateRoomEvent, hostConnectionId: string, ): Promise<RoomCreatedEvent> => {

    // throw if rounds empty

    let sessionId = uuid()
    let roomId = generateRoomId(ROOM_ID_LENGTH)

    let rounds = await Promise.all(event.rounds.map((round: CreateRound, idx: number) => {
        let r = generateRoundAsync(idx, round.categoryId, round.numOfQuestions)
        return r
    })) as Array<RoundSchema>

    if (rounds.length > 1) {
        rounds = rounds.sort((a: RoundSchema, b: RoundSchema) => {
            return (a.roundIdx > b.roundIdx ? 1 : -1)
        })
    }

    let room: RoomSchema = {
        currentQuestion: 0,
        currentRound: 0,
        finished: false,
        sessionId: sessionId,
        hostConnectionId: hostConnectionId,
        roomId: roomId,
        rounds: rounds,
        started: false
    }

    await _updateRoomAsync(room)

    let roomCreatedEvent: RoomCreatedEvent = {
        sessionId: sessionId,
        roomId: roomId,
        rounds: room.rounds,
        type: EventType.ROOM_CREATED
    }

    return roomCreatedEvent;
}

export const rejoinRoomAsync = async (event: RejoinRoomEvent): Promise<RoomJoinedEvent> => {

    let team = await _getTeamAsync(event.sessionId, event.teamId)

    let roomJoinedEvent: RoomJoinedEvent = {
        type: EventType.ROOM_REJOINED,
        sessionId: event.sessionId,
        teamId: team.teamId,
        teamName: team.teamName
    }

    return roomJoinedEvent
}

export const rejoinRoomAsHostAsync = async (event: RejoinRoomEvent): Promise<RoomRejoinedEvent> => {

    let room = await _getRoomBySessionIdAsync(event.sessionId)

    if (!room || room.roomId !== event.roomId)
        throw new GameError(GameErrorCode.ROOM_NOT_FOUND, "Room was not found")

    if (room.finished)
        throw new GameError(GameErrorCode.GAME_FINISHED, "Game has finished")

    let teams = await _getTeamsAsync(event.sessionId)

    let scores = teams.map((team: TeamSchema) => {
        let score: TeamScore = {
            teamId: team.teamId,
            teamName: team.teamName,
            score: team.score ?? 0
        }
        return score
    })

    let roomRejoinedEvent: RoomRejoinedEvent = {
        roomId: event.roomId,
        rounds: room.rounds,
        scores: scores,
        sessionId: event.sessionId,
        type: EventType.ROOM_HOST_REJOINED,
        gameStarted: room.started
    }

    return roomRejoinedEvent
}

export const startGameAsync = async (event: StartGameEvent): Promise<GameStartedEvent> => {

    let room = await _getRoomBySessionIdAsync(event.sessionId)

    if (room.finished)
        throw new GameError(GameErrorCode.GAME_FINISHED, "Game has finished")

    // if (room.started)
    //     throw new GameError(GameErrorCode.GAME_ALREADY_STARTED, "Game has already started")

    room.started = true

    await _updateRoomAsync(room)

    let gameStartedEvent: GameStartedEvent = {
        sessionId: event.sessionId,
        type: EventType.GAME_STARTED
    }

    return gameStartedEvent
}

export const finishGameAsync = async (event: FinishGameEvent): Promise<GameFinishedEvent> => {

    let room = await _getRoomBySessionIdAsync(event.sessionId, true)

    if (!room.started)
        throw new GameError(GameErrorCode.GAME_NOT_STARTED, "Game has not started")

    if (!room.finished) {
        room.finished = true

        await _updateRoomAsync(room)
    }

    let teams = await _getTeamsAsync(event.sessionId)

    let scores = teams.map((team: TeamSchema) => {
        let score: TeamScore = {
            teamId: team.teamId,
            teamName: team.teamName,
            score: team.score ?? 0
        }
        return score
    })

    scores = scores.sort((a, b) => {
        return a.score > b.score ? 1 : -1
    })

    let gameFinishedEvent: GameFinishedEvent = {
        sessionId: event.sessionId,
        type: EventType.GAME_FINISHED,
        scores: scores
    }

    return gameFinishedEvent
}

export const getRoomAsync = async (sessionId: string): Promise<RoomSchema> => {

    let room = await _getRoomBySessionIdAsync(sessionId, true)

    if (room.sessionId != sessionId) {
        throw new GameError(GameErrorCode.INVALID_SESSION_ID, 'sessionId does not match room')
    }

    return room
}

export const publishNextQuestionAsync = async (event: PublishNextQuestionEvent): Promise<QuestionPublishedEvent> => {

    let room = await _getRoomBySessionIdAsync(event.sessionId, true)
    let isLastQuestion = false

    if (!room.started)
        throw new GameError(GameErrorCode.GAME_NOT_STARTED, "Game has not started")

    if (room.finished)
        throw new GameError(GameErrorCode.GAME_FINISHED, "Game has finished")

    let question: Question = undefined

    if ((event.lastRoundNumber == undefined && event.lastQuestionNumber == undefined)) {
        // first question
        room.currentRound = 0
        room.currentQuestion = 0
    }
    else {
        if (event.lastRoundNumber == room.currentRound &&
            event.lastQuestionNumber == room.currentQuestion) {
            // next question
            if (room.currentQuestion < room.rounds[room.currentRound].questions.length - 1) {
                room.currentQuestion++
            }
            else {
                if (room.currentRound < room.rounds.length - 1) {
                    // next round
                    room.currentRound++
                    room.currentQuestion = 0
                } else {
                    room.finished = true
                }
            }

            await _updateRoomAsync(room)
        }
        else {
            // re-issue same question
        }
    }

    if (room.currentRound == room.rounds.length - 1
        && room.currentQuestion == room.rounds[room.currentRound].questions.length - 1) {
        isLastQuestion = true
    }

    question = room.rounds[room.currentRound].questions[room.currentQuestion]

    let questionPublishedEvent: QuestionPublishedEvent = {
        type: EventType.QUESTION_PUBLISHED,
        sessionId: room.sessionId,
        question: question,
        roundNumber: room.currentRound,
        questionNumber: room.currentQuestion,
        expiresInSeconds: QUESTION_EXPIRES_IN_SECONDS,
        isLastQuestion: isLastQuestion
    }

    return questionPublishedEvent
}

export const broadcastGameFinished = async (event: SessionEvent) => {
    let gameFinishedEvent: GameFinishedEvent = {
        sessionId: event.sessionId,
        type: EventType.GAME_FINISHED,
        scores: []
    }
    await broadcastMessageAsync(gameFinishedEvent)
}

export const generateRoomId = (length: number) => {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}