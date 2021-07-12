import { CardSet } from "../../models/CardSet";

export interface CustomSetsState {
  allIds: string[]
  byId: {[id: string]: CardSet}
}
export const customSets: CustomSetsState = {
  allIds: [],
  byId: {},
}