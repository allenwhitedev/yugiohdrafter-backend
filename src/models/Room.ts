import moment from "moment";

export interface Room {
  expires: moment.Moment // when room while expire if left inactive
  expiresMax: moment.Moment // max time a room will exist. to avoid permanent memory allocation 
  id: string,
  boosterIdsRound: string[],
  boosterIdsLP: string[],
  roomPlayerIds: string[]
}