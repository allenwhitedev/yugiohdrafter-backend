import { CardSet } from "../../models/CardSet";
import { Room } from "../../models/Room";
import { State } from "../../models/State";
import { customSets } from "./customSets";

// return customSets for room
export function customSetsForRoom(room: Room): State<CardSet> {
  const roomSetsById: { [id: string]: CardSet } = {}
  room.customSetIds.forEach(id => {
    roomSetsById[id] = customSets.byId[id]
  })
  const result: State<CardSet> = {
    allIds: room.customSetIds,
    byId: roomSetsById,
  } 
  return result
}