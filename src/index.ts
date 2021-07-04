import cors from 'cors'
import express from 'express'
import moment from 'moment'
import mongodb from 'mongodb'
import { ROOM_DEFAULT_EXPIRATION, unique4CharString } from './helpers/global'
import { Booster } from './models/Booster'
import { Room } from './models/Room'
import { RoomPlayer } from './models/RoomPlayer'
import { boosters } from './state/boosters'
import { roomPlayers } from './state/roomPlayers'
import { rooms } from './state/rooms'
import { stateAddWithMutation } from './state/utils'
const isProductionEnv = process.env.NODE_ENV === 'production' 

const app = express() // initialize express server
if (!isProductionEnv) // if in development environment allow cors from frontend dev origin 
  app.use(cors({origin:'http://localhost:3000'}))


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
app.get(`${baseApiUrl}/room/:id`, (req, res) => res.json(rooms.byId[req.params.id]))
app.post(`${baseApiUrl}/room`, (req, res) => {
  const roomId = unique4CharString(rooms.byId)
  const boostersNew: Booster[] = req.body.boostersDraft
  const roomNew: Room = {
    id: roomId,
    expires: moment().add(ROOM_DEFAULT_EXPIRATION, 'minute'),
    boosterIdsRound: [],
    boosterIdsDraft: boostersNew.map((booster) => booster.id)
  }
  stateAddWithMutation(rooms, [roomNew])

  boostersNew.forEach((booster) => {
    stateAddWithMutation(boosters, [booster])
  })

  const hostPlayer: RoomPlayer = {
    id: req.ip + "-" + roomId,
    name: req.body.player.name,
    isHost: true,
    isReady: false,
  }
  stateAddWithMutation(roomPlayers, [hostPlayer])

  return res.json(roomNew)
})

app.post(`${baseApiUrl}/room/joinRoom:id`, (req, res) => {
  const player: RoomPlayer = {
    id: req.ip + "-" + req.params.id,
    name: req.body.player.name,
    isHost: false,
    isReady: false,
  }
  stateAddWithMutation(roomPlayers, [player])

  const room = rooms.byId[req.params.id]
  room.roomPlayerIds.push(player.id)

  // return name of set or array of card ids that must be retrieved client side
  const cardSets = new Set<string | string[]>()
  room.boosterIdsDraft.forEach((boosterId) => {
    cardSets.add(boosters.byId[boosterId].cardIds || boosters.byId[boosterId].cardSetName)
  })
  return cardSets
})

app.post(`${baseApiUrl}/room`, (req, res) => {
  const roomId = unique4CharString(rooms.byId)

  // add landing page boosters (not the ones for a round)
  const boostersNew: Booster[] = req.body.boostersDraft
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
  }
  stateAddWithMutation(roomPlayers, [hostPlayer])

  // create the room
  const roomNew: Room = {
    id: roomId,
    expires: moment().add(ROOM_DEFAULT_EXPIRATION, 'minute'),
    boosterIdsRound: [],
    boosterIdsDraft: boostersNew.map((booster) => booster.id),
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
