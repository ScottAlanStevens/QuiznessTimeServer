import request from 'request-promise'
import { v4 as uuid } from 'uuid'
import { Question, RoundSchema, OpenTriviaQuestion, OpenTriviaQuestionsResponse } from '../models/schemas'
import { KeyValueList, KeyValuePair } from '../models/common'
import { AllHtmlEntities } from 'html-entities'

const html = new AllHtmlEntities()

const OpenTriviaBaseUrl = 'https://opentdb.com/api.php?'

const decode = (text: string): string => {
    return html.decode(text)
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&OElig;/g, "Œ")
        .replace(/&oelig;/g, "œ")
        .replace(/&Scaron;/g, "Š")
        .replace(/&scaron;/g, "š")
        .replace(/&Yuml;/g, "Ÿ")
        .replace(/&circ;/g, "ˆ")
        .replace(/&tilde;/g, "˜")
        .replace(/&ensp;/g, " ")
        .replace(/&emsp;/g, " ")
        .replace(/&thinsp;/g, " ")
        .replace(/&zwnj;/g, "‌")
        .replace(/&zwj;/g, "‍")
        .replace(/&lrm;/g, "‎")
        .replace(/&rlm;/g, "‏")
        .replace(/&ndash;/g, "–")
        .replace(/&mdash;/g, "—")
        .replace(/&lsquo;/g, "‘")
        .replace(/&rsquo;/g, "’")
        .replace(/&sbquo;/g, "‚")
        .replace(/&ldquo;/g, "“")
        .replace(/&rdquo;/g, "”")
        .replace(/&bdquo;/g, "„")
        .replace(/&dagger;/g, "†")
        .replace(/&Dagger;/g, "‡")
        .replace(/&permil;/g, "‰")
        .replace(/&lsaquo;/g, "‹")
        .replace(/&rsaquo;/g, "›")
        .replace(/&euro;/g, "€")
        .replace(/&#33;/g, "!")
        .replace(/&#34;/g, '"')
        .replace(/&#35;/g, "#")
        .replace(/&#36;/g, "$")
        .replace(/&#37;/g, "%")
        .replace(/&#38;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&#40;/g, "(")
        .replace(/&#41;/g, ")")
        .replace(/&#42;/g, "*")
        .replace(/&#43;/g, "+")
        .replace(/&#44;/g, ",")
        .replace(/&#45;/g, "-")
        .replace(/&#46;/g, ".")
        .replace(/&#47;/g, "/")
}

export const generateRoundAsync = async (roundIdx: number, categoryId: number, numOfQuestions: number): Promise<RoundSchema> => {

    let questions = await downloadQuestionsAsync(categoryId, numOfQuestions)

    return {
        roundIdx: roundIdx,
        categoryId: categoryId,
        numOfQuestions: numOfQuestions,
        questions: questions.results.map((q: OpenTriviaQuestion) => {

            let answers: KeyValueList<string, string> = []

            let correctAnswerId = uuid()

            answers.push({
                id: correctAnswerId,
                value: decode(q.correct_answer)
            })

            q.incorrect_answers.forEach((answer: string) => {
                answers.push({
                    id: uuid(),
                    value: answer
                })
            })

            answers = answers.sort((a: KeyValuePair<string, string>, b: KeyValuePair<string, string>) => {
                return a.value < b.value ? 1 : -1
            })

            let question: Question = {
                category: q.category,
                questionText: decode(q.question),
                answers: answers,
                answerId: correctAnswerId,
                questionId: uuid()
            }

            return question
        })
    }
}

export const downloadQuestionsAsync = async (categoryId: number, numOfQuestions: number): Promise<OpenTriviaQuestionsResponse> => {

    let url = `${OpenTriviaBaseUrl}category=${categoryId}&amount=${numOfQuestions}`

    let results: OpenTriviaQuestionsResponse = await request.get(url, {
        json: true
    })

    return results
}

export const OpenTriviaCategoriesDict = [
    {
        "id": 9,
        "name": "General Knowledge"
    },
    {
        "id": 10,
        "name": "Entertainment: Books"
    },
    {
        "id": 11,
        "name": "Entertainment: Film"
    },
    {
        "id": 12,
        "name": "Entertainment: Music"
    },
    {
        "id": 13,
        "name": "Entertainment: Musicals & Theatres"
    },
    {
        "id": 14,
        "name": "Entertainment: Television"
    },
    {
        "id": 15,
        "name": "Entertainment: Video Games"
    },
    {
        "id": 16,
        "name": "Entertainment: Board Games"
    },
    {
        "id": 17,
        "name": "Science & Nature"
    },
    {
        "id": 18,
        "name": "Science: Computers"
    },
    {
        "id": 19,
        "name": "Science: Mathematics"
    },
    {
        "id": 20,
        "name": "Mythology"
    },
    {
        "id": 21,
        "name": "Sports"
    },
    {
        "id": 22,
        "name": "Geography"
    },
    {
        "id": 23,
        "name": "History"
    },
    {
        "id": 24,
        "name": "Politics"
    },
    {
        "id": 25,
        "name": "Art"
    },
    {
        "id": 26,
        "name": "Celebrities"
    },
    {
        "id": 27,
        "name": "Animals"
    },
    {
        "id": 28,
        "name": "Vehicles"
    },
    {
        "id": 29,
        "name": "Entertainment: Comics"
    },
    {
        "id": 30,
        "name": "Science: Gadgets"
    },
    {
        "id": 31,
        "name": "Entertainment: Japanese Anime & Manga"
    },
    {
        "id": 32,
        "name": "Entertainment: Cartoon & Animations"
    }
].reduce((map: Record<number, string>, obj) => {
    map[obj.id] = obj.name
    return map
}, {})