import express from 'express'
import moment from 'moment'
import mongodb from 'mongodb'
import { ROOM_DEFAULT_EXPIRATION, unique4CharString } from './helpers/global'
import { Room } from './models/Room'
import { rooms } from './state/rooms'
import { stateAddWithMutation } from './state/utils'
const isProductionEnv = process.env.NODE_ENV === 'production' 

const app = express() // initialize express server

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
  const roomNew: Room = {
    id: roomId,
    expires: moment().add(ROOM_DEFAULT_EXPIRATION, 'minute'),
  }
  stateAddWithMutation(rooms, [roomNew])

  return res.json(roomNew)
})

// - start application
const PORT = 8000
const envString = isProductionEnv ? 'Production' : 'Development'
const serverStartMessage = `⚡️[server]: ${envString} server is running at https://localhost:${PORT}`

app.listen(PORT, () => { console.log(serverStartMessage) })
