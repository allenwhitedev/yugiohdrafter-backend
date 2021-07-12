import moment from "moment";

export interface Room {
  expires: moment.Moment
  id: string,
  boosterIdsRound: string[],
  boosterIdsLP: string[],
  roomPlayerIds: string[],
  customSetIds: string[]
}