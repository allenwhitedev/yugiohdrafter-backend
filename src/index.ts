import cors from 'cors'
import express, { Response } from 'express'
import moment from 'moment'
import mongodb from 'mongodb'
import { RoomResult } from './contracts/RoomResult'
import { ROOM_DEFAULT_EXPIRATION, unique4CharString } from './helpers/global'
import { Booster } from './models/Booster'
import { CardSet } from './models/CardSet'
import { Room } from './models/Room'
import { RoomPlayer } from './models/RoomPlayer'
import { boosters } from './state/boosters/boosters'
import { boostersLPForRoom } from './state/boosters/utils'
import { customSets } from './state/customSets/customSets'
import { customSetsForRoom } from './state/customSets/utils'
import { roomPlayers } from './state/roomPlayers'
import { roomPlayersForRoom } from './state/roomPlayers/utils'
import { rooms } from './state/rooms'
import { stateAddWithMutation } from './state/utils'
const isProductionEnv = process.env.NODE_ENV === 'production' 

const app = express() // initialize express server
if (!isProductionEnv) // if in development environment allow cors from frontend dev origin 
  app.use(cors({origin:'http://localhost:3000'}))

app.use(express.json()); //Used to parse JSON bodies
app.use(express.urlencoded()); //Parse URL-encoded bodies

// - initialize mongo db client
var MongoClient = mongodb.MongoClient

MongoClient.connect('mongodb://localhost:27017/yugiohdrafter', function (err: any, client: { db: (arg0: string) => any }) {
  if (err) throw err

  var db = client.db('yugiohdrafter')

  db.collection('mammals').find().toArray(function (err: any, result: any) {
    if (err) throw err

    console.log(result)
  })
})


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
  }
  return res.json(result)
})
app.post(`${baseApiUrl}/room`, (req, res: Response<RoomResult>) => {
  const roomId = unique4CharString(rooms.byId)
  
  const hostPlayer: RoomPlayer = {
    id: req.body.player.ip + "-" + roomId,
    name: req.body.player.name,
    isHost: true,
    isReady: false,
    ip: req.body.player.ip
  }
  stateAddWithMutation(roomPlayers, [hostPlayer])

  const boostersNew: Booster[] = req.body.boostersLP
  const customSetsNew: CardSet[] = req.body.customSets
  const roomNew: Room = {
    id: roomId,
    expires: moment().add(ROOM_DEFAULT_EXPIRATION, 'minute'),
    boosterIdsRound: [],
    boosterIdsLP: boostersNew.map((booster) => booster.id),
    roomPlayerIds: [hostPlayer.id],
    customSetIds: customSetsNew.map((set) => set.id)
  }
  stateAddWithMutation(rooms, [roomNew])

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
    isReady: false,
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
    customSets: customSetsForRoom(room)
  }
  return res.json(result)
})

// - start application
const PORT = 8000
const envString = isProductionEnv ? 'Production' : 'Development'
const serverStartMessage = `⚡️[server]: ${envString} server is running at https://localhost:${PORT}`

app.listen(PORT, () => { console.log(serverStartMessage) })
