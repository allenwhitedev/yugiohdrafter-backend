import { Booster } from "../../models/Booster";
import { Room } from "../../models/Room";
import { State } from "../../models/State";
import { boosters } from "./boosters";

// return landing page boosters for room
export function boostersLPForRoom(room: Room): State<Booster> {
  const currBoostersLPById: { [id: string]: Booster } = {}
  room.boosterIdsLP.forEach(id => {
    currBoostersLPById[id] = boosters.byId[id]
  })
  const result: State<Booster> = {
    allIds: room.boosterIdsLP,
    byId: currBoostersLPById,
  } 
  return result
}