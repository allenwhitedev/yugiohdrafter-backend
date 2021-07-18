import moment from "moment";

export interface Room {
  expires: moment.Moment
  id: string
  boosterIdsLP: string[]
  roomPlayerIds: string[]
  customSetIds: string[]
  numPlayers: number
  format: "sealed" | "draft"
  started: boolean
  boosterIdsDraft?: string[]
  currLPBoosterId?: string
}