import { _getTeamAsync, _getRoomByRoomIdAsync, _getRoomBySessionIdAsync, _updateTeamAsync } from '../lib/data'
import { JoinRoomEvent, RoomJoinedEvent, EventType, SubmitAnswerEvent, AnswerSubmittedEvent } from '../models/events'
import { KeyValuePair, GameError, GameErrorCode } from '../models/common'
import { TeamSchema } from '../models/schemas'
import { v4 as uuid } from 'uuid'

export const joinRoomAsync = async (event: JoinRoomEvent): Promise<RoomJoinedEvent> => {

    let room = await _getRoomByRoomIdAsync(event.roomId)

    if (room.finished) {
        throw new GameError(GameErrorCode.GAME_FINISHED, 'Game has finished')
    }

    let team: TeamSchema = {
        sessionId: room.sessionId,
        teamId: uuid(),
        teamName: event.teamName,
        score: 0,
        answers: []
    }

    let roomJoinedEvent: RoomJoinedEvent = {
        teamId: team.teamId,
        sessionId: room.sessionId,
        teamName: event.teamName,
        type: EventType.ROOM_JOINED
    }

    await _updateTeamAsync(team)

    return roomJoinedEvent;
}

export const submitAnswerAsync = async (event: SubmitAnswerEvent): Promise<AnswerSubmittedEvent> => {

    let team = await _getTeamAsync(event.sessionId, event.teamId)

    let alreadyAnswered = team.answers.find((question: KeyValuePair<string, string>) => {
        return question.id == event.questionId
    })

    if (alreadyAnswered) {
        throw new GameError(GameErrorCode.QUESTION_ALREADY_ANSWERED, 'Question has already been answered')
    }

    let room = await _getRoomBySessionIdAsync(event.sessionId)

    let currentQuestion = room.rounds[room.currentRound].questions[room.currentQuestion]

    if (currentQuestion.questionId != event.questionId) {
        throw new GameError(GameErrorCode.QUESTION_EXPIRED, 'This question has expired')
    }

    let answer = currentQuestion.answers.find((answer: KeyValuePair<string, string>) => {
        return answer.id == event.answerId
    })

    if (!answer) {
        throw new GameError(GameErrorCode.INVALID_ANSWER_ID, 'Invalid answerId')
    }

    team.answers.push({
        id: currentQuestion.questionId,
        value: answer.id
    })

    if (currentQuestion.answerId == event.answerId) {
        team.score++
    }

    await _updateTeamAsync(team)

    let answerSubmittedEvent: AnswerSubmittedEvent = {
        type: EventType.ANSWER_SUBMITTED,
        questionId: currentQuestion.questionId,
        answerId: answer.id,
        sessionId: event.sessionId,
        teamName: team.teamName,
        teamId: team.teamId,
        hostConnectionId: room.hostConnectionId
    }

    return answerSubmittedEvent
}