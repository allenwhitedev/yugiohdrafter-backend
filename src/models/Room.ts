import moment from "moment";

export interface Room {
  expires: moment.Moment
  id: string,
  boosterIdsLP: string[],
  roomPlayerIds: string[],
  customSetIds: string[]
  boosterIdsDraft?: string[],
}