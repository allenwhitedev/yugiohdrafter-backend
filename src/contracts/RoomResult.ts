import { Booster } from "../models/Booster"
import { CardSet } from "../models/CardSet"
import { Room } from "../models/Room"
import { RoomPlayer } from "../models/RoomPlayer"
import { State } from "../models/State"

export interface RoomResult {
  room: Room
  roomPlayers: State<RoomPlayer>
  boostersLP?: State<Booster>
  customSets?: State<CardSet>
  boostersDraft?: State<Booster>
}