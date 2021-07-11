import { roomPlayers } from ".";
import { Room } from "../../models/Room";
import { RoomPlayer } from "../../models/RoomPlayer";
import { State } from "../../models/State";

// return room players for room
export function roomPlayersForRoom(room: Room): State<RoomPlayer> {
  const currRoomPlayersById: { [id: string]: RoomPlayer } = {}
  room.roomPlayerIds.forEach(id => {
   currRoomPlayersById[id] = roomPlayers.byId[id]
  })
  const result: State<RoomPlayer> = {
    allIds: room.roomPlayerIds,
    byId: currRoomPlayersById,
  } 
  return result
}