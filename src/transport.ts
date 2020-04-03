import { ConnectionSchema } from "./models/schemas";
import { createRoomAsync, startGameAsync, publishNextQuestionAsync, finishGameAsync, rejoinRoomAsHostAsync, rejoinRoomAsync } from "./game/host";
import { Event, EventType, RoomCreatedEvent, CreateRoomEvent, RoomJoinedEvent, JoinRoomEvent, SessionEvent, StartGameEvent, QuestionPublishedEvent, PublishNextQuestionEvent, SubmitAnswerEvent, FinishGameEvent, GameFinishedEvent, GameStartedEvent, RejoinRoomEvent } from "./models/events";
import { GameError, GameErrorCode } from "./models/common";
import { joinRoomAsync, submitAnswerAsync } from "./game/player";
import { postToConnectionAsync } from "./lib/apiGateway";
import { scanAsync, putItemAsync, deleteItemAsync, getItemAsync } from "./lib/dynamo";

export async function processMessageAsync<T extends Event>(connectionId: string, event: T) {

    console.log('processMessageAsync', { event })

    try {

        switch (event.type) {
            case EventType.PING:
                await sendMessageAsync(connectionId, {
                    type: EventType.PING,
                    sessionId: event.sessionId,
                    message: "You've been pinged"
                })
                break;
            case EventType.PING_ALL:
                await broadcastMessageAsync({
                    type: EventType.PING,
                    sessionId: event.sessionId,
                    message: "Everyone's been pinged"
                })
                break;
            case EventType.CREATE_ROOM:
                let roomCreatedEvent: RoomCreatedEvent = await createRoomAsync(event as any as CreateRoomEvent, connectionId)

                await updateConnectionAsync(connectionId, roomCreatedEvent.sessionId, true)

                await sendMessageAsync(connectionId, roomCreatedEvent)

                return {
                    statusCode: 200,
                }
            case EventType.REJOIN_ROOM_HOST:
                let roomHostRejoinedEvent = await rejoinRoomAsHostAsync(event as any as RejoinRoomEvent)

                await updateConnectionAsync(connectionId, roomHostRejoinedEvent.sessionId, true)

                await sendMessageAsync(connectionId, roomHostRejoinedEvent)

                break;
            case EventType.REJOIN_ROOM:
                let roomRejoinedEvent = await rejoinRoomAsync(event as any as RejoinRoomEvent)

                await updateConnectionAsync(connectionId, roomRejoinedEvent.sessionId, false)

                await sendMessageAsync(connectionId, roomRejoinedEvent)

                await broadcastMessageAsync({
                    sessionId: roomRejoinedEvent.sessionId,
                    type: EventType.ROOM_REJOINED,
                    teamName: roomRejoinedEvent.teamName
                })
                break;
            case EventType.JOIN_ROOM:
                let roomJoinedEvent: RoomJoinedEvent = await joinRoomAsync(event as any as JoinRoomEvent)

                await updateConnectionAsync(connectionId, roomJoinedEvent.sessionId, false)

                await sendMessageAsync(connectionId, roomJoinedEvent)

                await broadcastMessageAsync({
                    sessionId: roomJoinedEvent.sessionId,
                    type: EventType.ROOM_JOINED,
                    teamName: roomJoinedEvent.teamName
                })

                break

            case EventType.START_GAME:

                if (!await senderIsHost(connectionId, event.sessionId)) {
                    throw new GameError(GameErrorCode.NOT_SESSION_OWNER, `Connection '${connectionId}' is not the host of session '${event.sessionId}'`)
                }

                let gameStartedEvent: GameStartedEvent = await startGameAsync(event as StartGameEvent)

                await broadcastMessageAsync(gameStartedEvent)

                break

            case EventType.FINISH_GAME:

                if (!await senderIsHost(connectionId, event.sessionId)) {
                    throw new GameError(GameErrorCode.NOT_SESSION_OWNER, `Connection '${connectionId}' is not the host of session '${event.sessionId}'`)
                }

                let gameFinishedEvent: GameFinishedEvent = await finishGameAsync(event as FinishGameEvent)

                await sendMessageAsync(connectionId, gameFinishedEvent)

                // delete gameFinishedEvent.scores

                await broadcastMessageAsync(gameFinishedEvent)

                break

            case EventType.PUBLISH_NEXT_QUESTION:

                if (!await senderIsHost(connectionId, event.sessionId)) {
                    throw new GameError(GameErrorCode.NOT_SESSION_OWNER, `Connection '${connectionId}' is not the host of session '${event.sessionId}'`)
                }

                let questionPublishedEvent: QuestionPublishedEvent = await publishNextQuestionAsync(event as any as PublishNextQuestionEvent)

                await sendMessageAsync(connectionId, questionPublishedEvent)

                delete questionPublishedEvent.question.answerId

                await broadcastMessageAsync(questionPublishedEvent)

                break

            case EventType.SUBMIT_ANSWER:

                let answerSubmittedEvent = await submitAnswerAsync(event as any as SubmitAnswerEvent)

                await sendMessageAsync(answerSubmittedEvent.hostConnectionId, answerSubmittedEvent)

                break;

            default:
                throw Error(`EventType '${event.type}' has no handler`)
        }
    }
    catch (err) {

        console.error(err, JSON.stringify(err, null, 2))

        if (err instanceof GameError) {
            let gameError = err as GameError
            await sendMessageAsync(connectionId, gameError.toEvent())
        } else {
        }
    }
    finally {
        return {
            statusCode: 200,
        }
    }
}

export async function senderIsHost(connectionId: string, sessionId: string): Promise<boolean> {
    let connection = await getConnectionAsync(connectionId)

    return connection.sessionId == sessionId && connection.isHost
}

export async function sendMessageAsync<T extends SessionEvent>(connectionId: string, message: T) {

    let data = JSON.stringify(message, null, 2)

    console.log('sendMessageAsync', { connectionId, data })

    await postToConnectionAsync({
        ConnectionId: connectionId,
        Data: data
    })
}

export async function broadcastMessageAsync<T extends SessionEvent>(message: T) {

    console.log('broadcastMessageAsync', JSON.stringify(message, null, 2))

    let connectionIds = await scanAsync<ConnectionSchema>(process.env.CONNECTION_TABLE_NAME)

    let promises: Array<Promise<any>> = []

    connectionIds
        .filter((connection: ConnectionSchema) => {
            return connection.sessionId == message.sessionId
        })
        .forEach(connectionId => {
            promises.push(
                postToConnectionAsync({
                    ConnectionId: connectionId.connectionId,
                    Data: JSON.stringify(message, null, 2)
                }))
        });

    await Promise.all(promises)
}

export const getConnectionAsync = async (connectionId: string): Promise<ConnectionSchema> => {

    console.log('getConnectionAsync', { connectionId })

    return await getItemAsync<ConnectionSchema>(process.env.CONNECTION_TABLE_NAME, { connectionId: connectionId })
}

export const updateConnectionAsync = async (connectionId: string, sessionId: string, isHost: boolean) => {

    console.log('updateConnectionAsync', { connectionId, sessionId })

    let connection: ConnectionSchema = {
        connectionId: connectionId,
        sessionId: sessionId,
        isHost: isHost
    }

    await putItemAsync(process.env.CONNECTION_TABLE_NAME, connection)
}

export const addConnectionAsync = async (connectionId: string) => {

    console.log('addConnectionAsync', { connectionId })

    let connection: ConnectionSchema = {
        connectionId: connectionId
    }

    await putItemAsync(process.env.CONNECTION_TABLE_NAME, connection)

    return {
        statusCode: 200
    }
}

export const deleteConnectionAsync = async (connectionId: any) => {

    console.log('deleteConnectionAsync', { connectionId })

    await deleteItemAsync(process.env.CONNECTION_TABLE_NAME, { connectionId: connectionId })

    return {
        statusCode: 200
    }
}