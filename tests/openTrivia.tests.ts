import { expect } from 'chai'
import { OpenTriviaCategoriesDict, downloadQuestionsAsync, generateRoundAsync } from '../src/game/openTrivia'

describe('Game Tests', () => {
    it('downloadQuestionsAsync downloads questions', async () => {
        // Arrange
        let categoryId = 9
        let numOfQuestions = 3

        // Act
        let response = await downloadQuestionsAsync(categoryId, numOfQuestions)

        // Assert
        expect(response).not.null;
        expect(response.response_code).eq(0)
        expect(response.results).lengthOf(numOfQuestions)
        expect(response.results[0].category).eq(OpenTriviaCategoriesDict[categoryId])
    })

    it('generateRoundAsync generates round', async () => {
        // Arrange
        let roundIdx = 2
        let categoryId = 9
        let numOfQuestions = 3

        // Act
        let result = await generateRoundAsync(roundIdx, categoryId, numOfQuestions)

        // Assert
        expect(result).not.null;
        expect(result.roundIdx).eq(roundIdx)
        expect(result.categoryId).eq(categoryId)
        expect(result.questions).lengthOf(numOfQuestions)
        expect(result.questions[0].category).eq(OpenTriviaCategoriesDict[categoryId])
    })
})