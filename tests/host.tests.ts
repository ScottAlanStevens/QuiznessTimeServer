import { ImportMock } from 'ts-mock-imports'
import { SinonStub } from 'sinon'
import * as dynamo from '../src/lib/dynamo'
import { v4 as uuid } from 'uuid'
import deep from 'deep-equal'
import { expect } from 'chai'
import { RoundSchema, RoomSchema } from '../src/models/schemas'
import * as openTrivia from '../src/game/openTrivia'
import { CreateRoomEvent, EventType, PublishNextQuestionEvent, QuestionPublishedEvent } from '../src/models/events'
import { createRoomAsync, getRoomAsync, publishNextQuestionAsync } from '../src/game/host'

describe('', () => {

    let putItemAsyncStub: SinonStub<any>
    let getItemAsyncStub: SinonStub<any>
    let generateRoundAsyncStub: SinonStub<any>

    let testRounds: Array<RoundSchema> = [
        {
            roundIdx: 1,
            categoryId: 20,
            numOfQuestions: 2,
            questions: [{
                questionId: "q1",
                category: "General Trash",
                questionText: "Who's your daddy",
                answers:
                    [
                        {
                            id: "a1",
                            value: "Me"
                        },
                        {
                            id: "a2",
                            value: "You"
                        },
                        {
                            id: "a3",
                            value: "Your father"
                        },
                        {
                            id: "a4",
                            value: "Your uncle who's really your dad"
                        },
                    ],
                answerId: "a1"
            }, {
                questionId: "q2",
                category: "General Trash",
                questionText: "Who's your daddy",
                answers:
                    [
                        {
                            id: "a1",
                            value: "Me"
                        },
                        {
                            id: "a2",
                            value: "You"
                        },
                        {
                            id: "a3",
                            value: "Your father"
                        },
                        {
                            id: "a4",
                            value: "Your uncle who's really your dad"
                        },
                    ],
                answerId: "a1"
            }]
        },
        {
            roundIdx: 0,
            categoryId: 10,
            numOfQuestions: 2,
            questions: [{
                questionId: "q3",
                category: "General Trash",
                answers: [
                    {
                        id: "a1",
                        value: "True"
                    },
                    {
                        id: "a2",
                        value: "False"
                    },
                ],
                answerId: "a1",
                questionText: "Is this the first question?"
            },
            {
                questionId: "q4",
                category: "General Trash",
                answers: [
                    {
                        id: "a1",
                        value: "True"
                    },
                    {
                        id: "a2",
                        value: "False"
                    },
                ],
                answerId: "a1",
                questionText: "Is this the first question?"
            }]
        }
    ]

    beforeEach(() => {
        putItemAsyncStub = ImportMock.mockFunction(dynamo, 'putItemAsync')
        getItemAsyncStub = ImportMock.mockFunction(dynamo, 'getItemAsync')
        generateRoundAsyncStub = ImportMock.mockFunction(openTrivia, 'generateRoundAsync')

        process.env.TEAM_TABLE_NAME = "quizness-teams-test"
        process.env.ROOM_TABLE_NAME = "quizness-rooms-test"

        generateRoundAsyncStub.onFirstCall().returns(new Promise((r) => {
            r(testRounds[0])
        }))
        generateRoundAsyncStub.onSecondCall().returns(new Promise((r) => {
            r(testRounds[1])
        }))
    })

    afterEach(() => {
        putItemAsyncStub.restore()
        getItemAsyncStub.restore()
        generateRoundAsyncStub.restore()

        delete process.env.CONNECTION_TABLE_NAME
        delete process.env.ROOM_TABLE_NAME
    })

    it('createGame creates a new game', async () => {
        // Arrange
        let request: CreateRoomEvent = {
            type: EventType.CREATE_ROOM,
            rounds: [
                {
                    categoryId: 10,
                    numOfQuestions: 1
                },
                {
                    categoryId: 20,
                    numOfQuestions: 1
                },
            ]
        }

        let testHostConnectionId = uuid()

        // Act
        let result = await createRoomAsync(request, testHostConnectionId)

        // Assert
        expect(result).not.null;
        expect(result.sessionId).not.null
        expect(result.roomId).not.null

        expect(generateRoundAsyncStub.callCount).eq(2)
        for (let i = 0; i < request.rounds.length; i++) {
            expect(generateRoundAsyncStub.args[i][0]).eq(i)
            expect(generateRoundAsyncStub.args[i][1]).eq(request.rounds[i].categoryId)
            expect(generateRoundAsyncStub.args[i][2]).eq(request.rounds[i].numOfQuestions)
        }

        expect(putItemAsyncStub.calledOnce).true
        expect(putItemAsyncStub.args[0][0]).eq(process.env.ROOM_TABLE_NAME)

        let passedObject = putItemAsyncStub.args[0][1] as RoomSchema
        expect(passedObject.currentQuestion).eq(0)
        expect(passedObject.currentRound).eq(0)
        expect(passedObject.finished).false
        expect(passedObject.sessionId).eq(result.sessionId)
        expect(passedObject.roomId).eq(result.roomId)
        expect(passedObject.rounds).length(request.rounds.length)
        expect(passedObject.rounds[0].categoryId).equals(testRounds[1].categoryId)
        expect(passedObject.rounds[1].categoryId).equals(testRounds[0].categoryId)
    })

    it('getRoomAsync returns game', async () => {
        // Arrange
        let testGame: RoomSchema = {
            sessionId: uuid(),
            hostConnectionId: uuid(),
            roomId: uuid(),
            rounds: testRounds,
            finished: false,
            started: false,
            currentRound: 1,
            currentQuestion: 0
        }

        getItemAsyncStub.returns(JSON.parse(JSON.stringify(testGame)))

        // Act
        let result = await getRoomAsync(testGame.sessionId)

        // Assert
        expect(deep(result, testGame)).true
    })

    it.only('incrementQuestionAsync follows game logic', async () => {
        // Arrange
        let testGame: RoomSchema = {
            sessionId: uuid(),
            roomId: uuid(),
            rounds: testRounds,
            finished: false,
            currentRound: 0,
            currentQuestion: 0,
            hostConnectionId: uuid(),
            started: true
        }

        let persistedGame: RoomSchema = clone(testGame)

        getItemAsyncStub.callsFake((...args: any) => {
            return clone(persistedGame)
        })
        putItemAsyncStub.callsFake((...args: any) => {
            persistedGame = clone(args[1])
            persistedGame.rounds = clone(testGame.rounds)
            return {}
        })


        let results: Array<QuestionPublishedEvent> = []

        let testEvent: PublishNextQuestionEvent = {
            type: EventType.PUBLISH_NEXT_QUESTION,
            sessionId: testGame.sessionId
        }

        // Act
        results.push(await publishNextQuestionAsync(testEvent))
        expect(results[0].questionNumber).eq(0)
        expect(results[0].roundNumber).eq(0)
        expect(results[0].isLastQuestion).false
        expect(persistedGame.finished).false

        testEvent.lastQuestionNumber = results[0].questionNumber
        testEvent.lastRoundNumber = results[0].roundNumber

        results.push(await publishNextQuestionAsync(testEvent))
        expect(results[1].questionNumber).eq(1)
        expect(results[1].roundNumber).eq(0)
        expect(results[1].isLastQuestion).false
        expect(persistedGame.finished).false

        testEvent.lastQuestionNumber = results[1].questionNumber
        testEvent.lastRoundNumber = results[1].roundNumber

        results.push(await publishNextQuestionAsync(testEvent))
        expect(results[2].questionNumber).eq(0)
        expect(results[2].roundNumber).eq(1)
        expect(results[2].isLastQuestion).false
        expect(persistedGame.finished).false

        testEvent.lastQuestionNumber = results[2].questionNumber
        testEvent.lastRoundNumber = results[2].roundNumber

        results.push(await publishNextQuestionAsync(testEvent))
        expect(results[3].questionNumber).eq(1)
        expect(results[3].roundNumber).eq(1)
        expect(results[3].isLastQuestion).true
        expect(persistedGame.finished).false

    })

    // it.only('getTeamsAsync returns teams', async () => {
    //     // Arrange
    //     let roomId = "FBRK"
    //     let gameId = "1ab9d942-6601-4b40-b150-9d0d6db13c4c"
    //     process.env.TEAM_TABLE_NAME = "quizness-teams"

    //     // Act
    //     let results = await getTeamsAsync(roomId, gameId)

    //     // Assert
    //     expect(results.length).eq(1)
    // })
})

const clone = (obj: any): any => {
    return JSON.parse(JSON.stringify(obj))
}