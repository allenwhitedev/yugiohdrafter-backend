import { roomPlayers } from ".";
import { Room } from "../../models/Room";
import { RoomPlayer } from "../../models/RoomPlayer";
import { State } from "../../models/State";
import { stateRemoveIdsWithMutation } from "../utils";

function shuffleArray(array: any[]) {
  let i = array.length - 1;
  for (; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}


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

export function removeNotReadyPlayers(room: Room) {
  const nonReadyIds = room.roomPlayerIds.filter((id) => !roomPlayers.byId[id].isReady)
  room.roomPlayerIds = room.roomPlayerIds.filter((id) => roomPlayers.byId[id].isReady)
  stateRemoveIdsWithMutation(roomPlayers, nonReadyIds)
}

export function assignPlayersPositions(room: Room) {
  const positionArray = [...room.roomPlayerIds]
  while(positionArray.length < 8) {
    positionArray.push("computer")
  }
  const shuffledArray = shuffleArray(positionArray)
  shuffledArray.forEach((id, idx) => {
    if(id !== "computer")
      roomPlayers.byId[id].position = idx
  })
}

export function updatePlayerPositions(room: Room) {
  room.roomPlayerIds.forEach((id) => {
    const player = roomPlayers.byId[id]
    const playerPosition = player.position === room.numPlayers - 1 ? 0 : player.position! + 1
  })
}