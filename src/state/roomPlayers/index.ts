import { RoomPlayer } from "../../models/RoomPlayer";
import { State } from "../../models/State";

export const roomPlayers: State<RoomPlayer> = {
  allIds: [],
  byId: {},
}