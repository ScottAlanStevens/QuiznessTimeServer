import { KeyValueList } from "./common"

export type ConnectionSchema = {
    connectionId: string
    sessionId?: string
    isHost?: boolean
}

export type RoomSchema = {
    roomId: string
    sessionId: string
    hostConnectionId: string
    rounds: Array<RoundSchema>
    currentRound: any
    currentQuestion: any
    started: boolean
    finished: boolean
}

export type RoundSchema = {
    roundIdx: number
    categoryId: number
    numOfQuestions: number
    questions: Array<Question>
}

export type Question = {
    questionId: string
    questionText: string
    answerId: string
    answers: KeyValueList<string, string>
    category: string
}

export type OpenTriviaQuestionsResponse = {
    response_code: number,
    results?: Array<OpenTriviaQuestion>
}

export type OpenTriviaQuestion = {
    category: string,
    correct_answer: string,
    incorrect_answers: Array<string>,
    difficulty: string,
    question: string,
    type: OpenTriviaQuestionType,
}

export enum OpenTriviaQuestionType {
    multiple = "multiple",
    boolean = "boolean"
}

export type TeamSchema = {
    sessionId: string,
    teamId: string,
    teamName: string,
    score?: number,
    answers?: KeyValueList<string, string>
}