import { GameError, GameErrorCode } from "../models/common"
import { getItemAsync, queryAsync, scanAsync, DynamoKeyQueryItem, putItemAsync } from "./dynamo"
import { RoomSchema, TeamSchema } from "../models/schemas"

export const _updateRoomAsync = async (room: RoomSchema): Promise<void> => {
    await putItemAsync(process.env.ROOM_TABLE_NAME, room)
}

export const _updateTeamAsync = async (team: TeamSchema): Promise<void> => {
    await putItemAsync(process.env.TEAM_TABLE_NAME, team)
}

export const _getTeamAsync = async (sessionId: string, teamId: string): Promise<TeamSchema> => {

    let team = await getItemAsync<TeamSchema>(process.env.TEAM_TABLE_NAME, {
        sessionId: sessionId,
        teamId: teamId
    })

    if (team == undefined) {
        throw new GameError(GameErrorCode.TEAM_NOT_FOUND, "Team not found")
    }

    return team
}

export const _getTeamsAsync = async (sessionId: string): Promise<Array<TeamSchema>> => {

    let keys: Array<DynamoKeyQueryItem> = [
        {
            keyName: "sessionId",
            keyValue: sessionId
        }
    ]

    let teams = await queryAsync<TeamSchema>(process.env.TEAM_TABLE_NAME, keys)

    return teams
}

export const _getRoomByRoomIdAsync = async (roomId: string): Promise<RoomSchema> => {

    let rooms = await scanAsync<RoomSchema>(process.env.ROOM_TABLE_NAME)

    let room = rooms.find((r: RoomSchema) => {
        return r.roomId == roomId
    })

    if (room == undefined || room.finished) {
        throw new GameError(GameErrorCode.ROOM_NOT_FOUND, "Room not found")

    }

    return room
}

export const _getRoomBySessionIdAsync = async (sessionId: string, ignoreFinished: boolean = false): Promise<RoomSchema> => {

    let room = await getItemAsync<RoomSchema>(process.env.ROOM_TABLE_NAME, { sessionId: sessionId })

    if (room == undefined) {
        throw new GameError(GameErrorCode.ROOM_NOT_FOUND, "Room not found")
    }

    if (ignoreFinished == false && room.finished) {
        throw new GameError(GameErrorCode.GAME_FINISHED, "Game has finished")
    }

    return room
}