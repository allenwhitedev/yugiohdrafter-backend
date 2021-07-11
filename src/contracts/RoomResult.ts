import { Room } from "../models/Room"
import { RoomPlayer } from "../models/RoomPlayer"
import { State } from "../models/State"

export interface RoomResult {
  room: Room
  roomPlayers: State<RoomPlayer>
}