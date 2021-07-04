import { RoomPlayer } from "../models/RoomPlayer";

export interface RoomPlayersState {
  allIds: string[]
  byId: {[id: string]: RoomPlayer}
}
export const roomPlayers: RoomPlayersState = {
  allIds: [],
  byId: {},
}