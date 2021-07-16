import { State, StateItem } from "../models/State";

export function stateAddWithMutation<T extends StateItem>(state: State<T>, items: Array<T>) {
  for (const item of items) {
    const id = item.id
    if (state.allIds.includes(id))
      state.allIds.push(id)

    state.byId[id] = item
  }
}

export function stateRemoveIdsWithMutation<T extends StateItem>(state: State<T>, ids: Array<string>) {
  ids.forEach((id) => {
    state.allIds = state.allIds.filter((i) => id !== i)
    delete state.byId[id]
  })
}