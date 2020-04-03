import { ApiGatewayManagementApi } from 'aws-sdk'
import { ConnectionSchema } from '../src/models/schemas'
import { CreateRoomEvent, EventType, RoomCreatedEvent } from '../src/models/events'
import { expect } from 'chai'
import { ImportMock } from 'ts-mock-imports'
import { processMessageAsync, sendMessageAsync, broadcastMessageAsync } from '../src/transport'
import { SinonStub } from 'sinon'
import { v4 as uuid } from 'uuid'
import * as apiGatewayModule from '../src/lib/apiGateway'
import * as dynamoModule from '../src/lib/dynamo'
import * as hostModule from '../src/game/host'

describe('transport service tests', () => {

    let createRoomAsyncStub: SinonStub<any>
    let postToConnectionAsyncStub: SinonStub<any>
    let scanAsyncStub: SinonStub<any>

    let testRoomCreatedEvent: RoomCreatedEvent = {
        type: EventType.ROOM_CREATED,
        gameId: uuid(),
        roomId: uuid(),
        rounds: [
            {
                categoryId: 1,
                numOfQuestions: 3,
                questions: [],
                roundIdx: 0
            }
        ]
    }

    beforeEach(() => {
        createRoomAsyncStub = ImportMock.mockFunction(hostModule, 'createRoomAsync')
        postToConnectionAsyncStub = ImportMock.mockFunction(apiGatewayModule, 'postToConnectionAsync')
        scanAsyncStub = ImportMock.mockFunction(dynamoModule, 'scanAsync')

        createRoomAsyncStub.returns(testRoomCreatedEvent)

        process.env.ENDPOINT = "123456.execute-api.eu-west-2.amazonaws.com/Test"
    })

    afterEach(() => {
        createRoomAsyncStub.restore()
        postToConnectionAsyncStub.restore()
        scanAsyncStub.restore()

        delete process.env.ENDPOINT
    })

    it('processMessageAsync', async () => {
        // Arrange
        let testConnectionId: string = uuid()

        let testMessage: CreateRoomEvent = {
            type: EventType.CREATE_ROOM,
            rounds: [
                {
                    categoryId: 1,
                    numOfQuestions: 3
                }
            ]
        }

        // Act
        await processMessageAsync(testConnectionId, testMessage)

        // Assert
        expect(createRoomAsyncStub.calledOnce).true
        expect(postToConnectionAsyncStub.calledOnce).true
        expect(scanAsyncStub.called).false

        let sentMessageParams = postToConnectionAsyncStub.args[0][0] as ApiGatewayManagementApi.PostToConnectionRequest

        expect(sentMessageParams.ConnectionId).eq(testConnectionId)
        expect(sentMessageParams.Data).eq(JSON.stringify(testRoomCreatedEvent, null, 2))
    })

    it('sendMessageAsync', async () => {
        // Arrange
        let testConnectionId: string = uuid()

        let testMessage: CreateRoomEvent = {
            type: EventType.CREATE_ROOM,
            rounds: [
                {
                    categoryId: 1,
                    numOfQuestions: 3
                }
            ]
        }

        // Act
        await sendMessageAsync(testConnectionId, testMessage)

        // Assert
        expect(postToConnectionAsyncStub.calledOnce).true
        expect(scanAsyncStub.called).false

        let sentMessageParams = postToConnectionAsyncStub.args[0][0] as ApiGatewayManagementApi.PostToConnectionRequest

        expect(sentMessageParams.ConnectionId).eq(testConnectionId)
        expect(sentMessageParams.Data).eq(JSON.stringify(testMessage, null, 2))
    })

    it('broadcastMessageAsync', async () => {
        // Arrange
        let testConnectionIds: Array<ConnectionSchema> = [
            {
                connectionId: uuid()
            },
            {
                connectionId: uuid()
            },
            {
                connectionId: uuid()
            }
        ]

        scanAsyncStub.returns(testConnectionIds)

        let testMessage: CreateRoomEvent = {
            type: EventType.CREATE_ROOM,
            rounds: [
                {
                    categoryId: 1,
                    numOfQuestions: 3
                }
            ]
        }

        // Act
        await broadcastMessageAsync(testMessage)

        // Assert
        expect(scanAsyncStub.calledOnce).true
        expect(postToConnectionAsyncStub.callCount).eq(testConnectionIds.length)

        postToConnectionAsyncStub.args.forEach((args: ApiGatewayManagementApi.PostToConnectionRequest[], idx: number) => {
            expect(args[0].ConnectionId).eq(testConnectionIds[idx].connectionId)
            expect(args[0].Data).eq(JSON.stringify(testMessage, null, 2))
        })
    })
})