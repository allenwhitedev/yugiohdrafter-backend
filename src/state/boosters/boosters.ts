import { Booster } from "../../models/Booster";

export interface BoostersState {
  allIds: string[]
  byId: {[id: string]: Booster}
}
export const boosters: BoostersState = {
  allIds: [],
  byId: {},
}