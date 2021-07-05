import { Room } from "../models/Room";

// - global room constant (this may go to redis or database if memory ends up being a concern)
export interface RoomsState {
  allIds: string[]
  byId: {[id: string]: Room}
}
export const rooms: RoomsState = {
  allIds: [],
  byId: {},
}