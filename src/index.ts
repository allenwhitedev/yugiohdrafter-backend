import cors from 'cors'
import express, { Response } from 'express'
import moment from 'moment'
import { RoomResult } from './contracts/RoomResult'
import { collections, connectToDatabase } from './db'
import { ROOM_DEFAULT_EXPIRATION, unique4CharString } from './helpers/global'
import { Booster } from './models/Booster'
import { CardPick } from './models/CardPick'
import { CardSet } from './models/CardSet'
import { Room } from './models/Room'
import { RoomPlayer } from './models/RoomPlayer'
import { boosters } from './state/boosters/boosters'
import { boostersDraftForRoom, boostersLPForRoom, removeCardFromBooster } from './state/boosters/utils'
import { customSets } from './state/customSets/customSets'
import { customSetsForRoom } from './state/customSets/utils'
import { roomPlayers } from './state/roomPlayers'
import { assignPlayersPositions, removeNotReadyPlayers, roomPlayersForRoom, updatePlayerPositions } from './state/roomPlayers/utils'
import { rooms } from './state/rooms'
import { stateAddWithMutation } from './state/utils'
const isProductionEnv = process.env.NODE_ENV === 'production' 

const app = express() // initialize express server
if (!isProductionEnv) // if in development environment allow cors from frontend dev origin 
  app.use(cors({origin:'http://localhost:3000'}))

app.use(express.json()); //Used to parse JSON bodies
app.use(express.urlencoded()); //Parse URL-encoded bodies

// - routes
const baseApiUrl = '/api'
app.get(`${baseApiUrl}/`, (req, res) => res.send('Express + TypeScript Server'))
app.get(`${baseApiUrl}/test`, (req, res) => res.json({message: 'You just successfully queried yugiohdrafter-backend'}))

// -- rooms
app.get(`${baseApiUrl}/room`, (req, res) => res.json(rooms))
app.get(`${baseApiUrl}/room/:id`, (req, res: Response<RoomResult>) => {
  const room = rooms.byId[req.params.id]
  const roomPlayers = roomPlayersForRoom(room)
  const result: RoomResult = {
    room,
    roomPlayers,
    boostersDraft: boostersDraftForRoom(room),
  }
  return res.json(result)
})
app.post(`${baseApiUrl}/room/updatePlayer/:id`, (req, res: Response<RoomResult>) => {
  const room = rooms.byId[req.params.id]
  const roomPlayers = roomPlayersForRoom(room)
  if(req.body.player.name !== undefined) 
    roomPlayers.byId[req.body.player.ip + "-" + req.params.id].name = req.body.player.name
  if(req.body.player.isReady !== undefined)
    roomPlayers.byId[req.body.player.ip + "-" + req.params.id].isReady = req.body.player.isReady

  const result: RoomResult = {
    room,
    roomPlayers,
    boostersDraft: boostersDraftForRoom(room)
  }
  return res.json(result)
})

app.post(`${baseApiUrl}/room`, (req, res: Response<RoomResult>) => {
  const roomId = unique4CharString(rooms.byId)
  
  const hostPlayer: RoomPlayer = {
    id: req.body.player.ip + "-" + roomId,
    name: req.body.player.name,
    isHost: true,
    isReady: true,
    ip: req.body.player.ip
  }
  stateAddWithMutation(roomPlayers, [hostPlayer])

  const boostersNew: Booster[] = req.body.boostersLP
  const customSetsNew: CardSet[] = req.body.customSets
  const roomNew: Room = {
    id: roomId,
    expires: moment().add(ROOM_DEFAULT_EXPIRATION, 'minute'),
    boosterIdsLP: boostersNew.map((booster) => booster.id),
    roomPlayerIds: [hostPlayer.id],
    customSetIds: customSetsNew.map((set) => set.id),
    numPlayers: 8,
    started: false,
    format: req.body.format
  }

  boostersNew.forEach((booster) => {
    stateAddWithMutation(boosters, [booster])
  })
  customSetsNew.forEach((set) => {
    stateAddWithMutation(customSets, [set])
  })
  
  stateAddWithMutation(rooms, [roomNew])

  const result: RoomResult = {
    room: roomNew,
    roomPlayers: {
      allIds: roomNew.roomPlayerIds,
      byId: { [hostPlayer.id]: hostPlayer }, 
    }
  }
  res.json(result)
})

app.post(`${baseApiUrl}/room/joinRoom/:id`, (req, res: Response<RoomResult>) => {
  const player: RoomPlayer = {
    id: req.body.player.ip + "-" + req.params.id,
    name: req.body.player.name,
    isHost: false,
    isReady: true,
    ip: req.body.player.ip
  }
  stateAddWithMutation(roomPlayers, [player])

  const room = rooms.byId[req.params.id]
  // treat like a Set to enforce unique entries (JS Set is annoying to serialize)
  if (!room.roomPlayerIds.includes(player.id)) 
    room.roomPlayerIds.push(player.id)
  
  // - return room players for room client is joining
  const currRoomPlayersById: { [id: string]: RoomPlayer } = {}
  room.roomPlayerIds.forEach(id => {
   currRoomPlayersById[id] = roomPlayers.byId[id]
  })
  const result: RoomResult = {
    room,
    roomPlayers: roomPlayersForRoom(room),
    boostersLP: boostersLPForRoom(room),
    customSets: customSetsForRoom(room),
  }
  return res.json(result)
})

app.post(`${baseApiUrl}/room/startDraft/:id`, (req, res: Response<RoomResult>) => {
  const roomId = req.params.id
  const boostersNew: Booster[] = req.body.boostersDraft
  const room = rooms.byId[roomId]

  room.currLPBoosterId = room.boosterIdsLP[0]
  room.boosterIdsDraft = boostersNew.map((booster) => booster.id)
  room.started = true

  boostersNew.forEach((booster) => {
    stateAddWithMutation(boosters, [booster])
  })

  removeNotReadyPlayers(room)
  assignPlayersPositions(room)

  const result: RoomResult = {
    room,
    roomPlayers: roomPlayersForRoom(room),
    boostersLP: boostersLPForRoom(room),
    customSets: customSetsForRoom(room),
    boostersDraft: boostersDraftForRoom(room)
  }
  res.json(result)
})

app.post(`${baseApiUrl}/room/startSealed/:id`, (req, res: Response<RoomResult>) => {
  const roomId = req.params.id
  const room = rooms.byId[roomId]

  room.started = true

  removeNotReadyPlayers(room)

  const result: RoomResult = {
    room,
    roomPlayers: roomPlayersForRoom(room),
    boostersLP: boostersLPForRoom(room),
    customSets: customSetsForRoom(room),
    boostersDraft: boostersDraftForRoom(room)
  }
  res.json(result)
})

app.post(`${baseApiUrl}/room/nextRound/:id`, (req, res: Response<RoomResult>) => {
  const roomId = req.params.id
  const boostersNew: Booster[] = req.body.boostersDraft
  const room = rooms.byId[roomId]

  room.currLPBoosterId = room.boosterIdsLP[room.boosterIdsLP.findIndex((id) => id === room.currLPBoosterId) + 1]
  room.boosterIdsDraft = boostersNew.map((booster) => booster.id)

  boostersNew.forEach((booster) => {
    stateAddWithMutation(boosters, [booster])
  })

  const result: RoomResult = {
    room,
    roomPlayers: roomPlayersForRoom(room),
    boostersLP: boostersLPForRoom(room),
    customSets: customSetsForRoom(room),
    boostersDraft: boostersDraftForRoom(room)
  }
  res.json(result)
})

app.post(`${baseApiUrl}/room/draftPicks/:id`, (req, res: Response<RoomResult>) => {
  const roomId = req.params.id
  const draftPicks: CardPick[] = req.body.draftPicks
  const room = rooms.byId[roomId]

  draftPicks.forEach((pick) => {
    removeCardFromBooster(pick.cardId, pick.boosterId)
  })

  updatePlayerPositions(room)

  const result: RoomResult = {
    room,
    roomPlayers: roomPlayersForRoom(room),
    boostersLP: boostersLPForRoom(room),
    customSets: customSetsForRoom(room),
    boostersDraft: boostersDraftForRoom(room)
  }
  res.json(result)
})

// - cardSets
app.post(`${baseApiUrl}/cardSet`, async (req, res) => {
  const b = req.body
  const customSet: CardSet = {
    custom_set: b.custom_set,
    id: b.id,
    num_of_cards: b.num_of_cards,
    set_code: b.set_code,
    set_name: b.set_name,
    tcg_date: b.tcg_date,
    author: b.author,
  }
  const dbResult = await collections.cardSets?.insertOne(customSet)

  if (dbResult?.result.ok)
    res.json(customSet) 
  else
    res.json({error: `Could not insert card set '${req.body.set_name}'. ${dbResult?.result}`})
})

app.delete(`${baseApiUrl}/cardSet/:ids`, async (req, res) => {
  const idsToDelete = req.params.ids.split(',')

  const dbResult = await collections.cardSets?.deleteMany({id: {$in: idsToDelete}})

  if (dbResult?.result.ok)
    res.json({message: `Successfully deleted ${dbResult.deletedCount}`}) 
  else
    res.json({error: `Could not delete card set(s) '${req.params.ids}'. ${dbResult?.result}`})
})

app.get(`${baseApiUrl}/cardSet`, async (req, res) => {
  const b = req.body
  const customSet: CardSet = {
    card_ids: b.card_ids,
    custom_set: b.custom_set,
    id: b.id,
    num_of_cards: b.num_of_cards,
    set_code: b.set_code,
    set_name: b.set_name,
    tcg_date: b.tcg_date,
    author: b.author,
  }
  const setsFromDb = await collections.cardSets?.find().toArray()
  return res.json(setsFromDb)
})

// - start application
const PORT = 8000
const envString = isProductionEnv ? 'Production' : 'Development'
const serverStartMessage = `⚡️[server]: ${envString} server is running at https://localhost:${PORT}`

connectToDatabase()
app.listen(PORT, () => { console.log(serverStartMessage) })
