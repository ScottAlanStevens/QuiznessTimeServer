import { getItemAsync } from '../src/lib/dynamo'
import { expect } from 'chai'
import { _getRoomBySessionIdAsync, _getTeamsAsync } from '../src/lib/data'

describe('', () => {

    it('', async () => {
        // Arrange
        let sessionId = "925ec782-8f8c-46b2-87bf-925a664fc99b"
        let teamId = "cac2caab-8d3b-4121-a792-4757c0d7b112"

        // Act
        let result = await getItemAsync("quizness-teams", {
            sessionId: sessionId,
            teamId: teamId
        })

        // Assert
        expect(result).not.null
    })

    it.only('', async () => {
        // Arrange
        process.env.ROOM_TABLE_NAME = "quizness-rooms"
        process.env.TEAM_TABLE_NAME = "quizness-teams"
        let sessionId = "925ec782-8f8c-46b2-87bf-925a664fc99b"
        let teamId = "cac2caab-8d3b-4121-a792-4757c0d7b112"

        // Act
        let result = await _getTeamsAsync(sessionId)

        // Assert
        expect(result).not.null
    })
})