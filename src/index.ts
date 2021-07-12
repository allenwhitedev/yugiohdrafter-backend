import cors from 'cors'
import express, { Response } from 'express'
import moment from 'moment'
import mongodb from 'mongodb'
import { RoomResult } from './contracts/RoomResult'
import { ROOM_DEFAULT_EXPIRATION_IN_MINUTES, ROOM_DEFAULT_EXPIRATION_MAX_IN_HOURS, unique4CharString } from './helpers/global'
import { Booster } from './models/Booster'
import { Room } from './models/Room'
import { RoomPlayer } from './models/RoomPlayer'
import { boosters } from './state/boosters'
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
app.get(`${baseApiUrl}/room`, (req, res) => res.json(rooms)) // GET all rooms
app.get(`${baseApiUrl}/room/:id`, (req, res: Response<RoomResult>) => { // GET single room by id 
  const room = rooms.byId[req.params.id]
  const roomPlayers = roomPlayersForRoom(room)
  const result: RoomResult = {
    room,
    roomPlayers,
  }
  return res.json(result)
})
app.post(`${baseApiUrl}/room/updatePlayer/:id`, (req, res: Response<RoomResult>, next) => { // update roomPlayer (isReady, etc.)
  try {
    const room = rooms.byId[req.params.id]
    const roomPlayers = roomPlayersForRoom(room)
    if (req.body.player.name !== undefined) 
      roomPlayers.byId[req.body.player.ip + "-" + req.params.id].name = req.body.player.name
    if (req.body.player.isReady !== undefined)
      roomPlayers.byId[req.body.player.ip + "-" + req.params.id].isReady = req.body.player.isReady
  
    room.expires = moment().add(ROOM_DEFAULT_EXPIRATION_IN_MINUTES, 'minute') // update to room extends its expiration

    const result: RoomResult = {
      room,
      roomPlayers,
    }
    return res.json(result)
  } catch (error: any) {
    return next(error) // express will handle error + send a 500 HTTP status code
  }
})

app.post(`${baseApiUrl}/room/joinRoom/:id`, (req, res: Response<RoomResult>) => { // add player to existing room
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
  if (!room.roomPlayerIds.includes(player.id)) {
    room.roomPlayerIds.push(player.id)
    room.expires = moment().add(ROOM_DEFAULT_EXPIRATION_IN_MINUTES, 'minute') // update to room extends its expiration
  }

  // return name of set or array of card ids that must be retrieved client side
  const cardSets = new Set<string | string[]>()
  room.boosterIdsLP.forEach((boosterId) => {
    cardSets.add(boosters.byId[boosterId].cardIds || boosters.byId[boosterId].cardSetName)
  })
  
  // - return room players for room client is joining
  const currRoomPlayersById: { [id: string]: RoomPlayer } = {}
  room.roomPlayerIds.forEach(id => {
   currRoomPlayersById[id] = roomPlayers.byId[id]
  })
  const result: RoomResult= {
    room,
    roomPlayers: roomPlayersForRoom(room),
  }
  return res.json(result)
})

app.post(`${baseApiUrl}/room`, (req, res) => { // create new room
  const roomId = unique4CharString(rooms.byId)

  // add landing page boosters (not the ones for a round)
  const boostersNew: Booster[] = req.body.boostersLP
  boostersNew.forEach((booster) => {
    stateAddWithMutation(boosters, [booster])
  })

  // add the host player
  const hostId = unique4CharString(rooms.byId)
  const hostPlayer: RoomPlayer = {
    id: hostId,
    name: req.body.player.name,
    isHost: req.body.player.isHost,
    isReady: false,
    ip: req.body.player.ip,
  }
  stateAddWithMutation(roomPlayers, [hostPlayer])

  // create the room
  const roomNew: Room = {
    id: roomId,
    expires: moment().add(ROOM_DEFAULT_EXPIRATION_IN_MINUTES, 'minute'),
    expiresMax: moment().add(ROOM_DEFAULT_EXPIRATION_MAX_IN_HOURS, 'hour'),
    boosterIdsRound: [],
    boosterIdsLP: boostersNew.map((booster) => booster.id),
    roomPlayerIds: [hostId]
 }
  stateAddWithMutation(rooms, [roomNew])

  return res.json(roomNew)
})

// - start application
const PORT = 8000
const envString = isProductionEnv ? 'Production' : 'Development'
const serverStartMessage = `⚡️[server]: ${envString} server is running at https://localhost:${PORT}`

app.listen(PORT, () => { console.log(serverStartMessage) })
