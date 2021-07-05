export interface StateItem {
  id: string
}
export interface State<T extends StateItem> {
  allIds: string[]
  byId: {[id: string]: T}
}