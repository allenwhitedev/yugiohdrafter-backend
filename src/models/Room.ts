import moment from "moment";

export interface Room {
  expires: moment.Moment
  id: string,
  boosterIdsLP: string[],
  roomPlayerIds: string[],
  customSetIds: string[]
  numPlayers: number
  boosterIdsDraft?: string[],
  currLPBoosterId?: string
}