import { State, StateItem } from "../models/State";

export function stateAddWithMutation<T extends StateItem>(state: State<T>, items: Array<T>) {
  for (const item of items) {
    const id = item.id
    state.allIds.concat(id) 
    state.byId[id] = item
  }
}