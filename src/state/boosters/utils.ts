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

// return draft boosters for room
export function boostersDraftForRoom(room: Room): State<Booster> {
    if(!room.boosterIdsDraft || room.boosterIdsDraft.length === 0) {
        return {allIds: [], byId: {}}
    }
    const currBoostersById: { [id: string]: Booster } = {}
    room.boosterIdsDraft.forEach(id => {
        currBoostersById[id] = boosters.byId[id]
    })
    const result: State<Booster> = {
      allIds: room.boosterIdsDraft,
      byId: currBoostersById,
    } 
    return result
  }