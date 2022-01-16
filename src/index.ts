import cors from 'cors'
import express, { Response } from 'express'
import moment from 'moment'
import { RoomResult } from './contracts/RoomResult'
import { collections, connectToDatabase, MONGODB_URI } from './db'
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
import bcrypt from 'bcrypt';
import session from 'express-session';
import ConnectMongoDBSession from 'connect-mongodb-session'
import { User } from './models/User'
import emailkey from './emailkey'
import { v4 as uuidv4 } from 'uuid';
import { resetPasswordDict } from './state/resetPasswords/resetPasswords'
const axios = require("axios")

const isProductionEnv = process.env.NODE_ENV === 'production'
const MongoDBStore = ConnectMongoDBSession(session)
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "mySessions"
})

const app = express() // initialize express server
if (!isProductionEnv) // if in development environment allow cors from frontend dev origin 
  app.use(cors({ origin: 'http://localhost:3000' }))

app.use(express.json()); //Used to parse JSON bodies
app.use(express.urlencoded()); //Parse URL-encoded bodies
app.use(session({
  secret: "yugiohdraftersecretkey",
  resave: false,
  saveUninitialized: false,
  store,
}))

// - routes
const baseApiUrl = '/api'
app.get(`${baseApiUrl}/`, (req, res) => res.send('Express + TypeScript Server'))
app.get(`${baseApiUrl}/test`, (req, res) => res.json({ message: 'You just successfully queried yugiohdrafter-backend' }))

// login
// verify user has active session
// if active session, send email to client
app.get(`${baseApiUrl}/users/`, (req, res) => {
  if ((req.session as any).isAuth) {
    return res.send((req.session as any).email)
  } else {
    return res.send(("No active session"))
  }
})

app.get(`${baseApiUrl}/users/logout`, (req, res) => {
  req.session.destroy((err) => {
    if (err) throw err;
    return res.send("Success")
  });
})

app.post(`${baseApiUrl}/users/createAccount`, async (req, res) => {
  const users = await collections.users?.find().toArray()!
  const user = users.find((user) => user.email === req.body.email)
  if (user) {
    return res.status(500).json({ error: "User already exists with this email" })
  }
  try {
    const salt = await bcrypt.genSalt()
    const hashedPassword = await bcrypt.hash(req.body.password, salt)
    const user: User = { email: req.body.email, password: hashedPassword }
    const dbResult = await collections.users?.insertOne(user)

    if (dbResult?.result.ok) {
      (req.session as any).isAuth = true;
      (req.session as any).email = req.body.email;
    }
    else
      return res.status(500).json({ error: `Could not create user '. ${dbResult?.result}` })
    return res.json(dbResult);
  }
  catch (e) {
    return res.status(500).end();
  }

})

app.post(`${baseApiUrl}/users/login`, async (req, res) => {
  const users = await collections.users?.find().toArray()!
  const user = users.find((user) => user.email === req.body.email)
  if (!user) {
    return res.status(400).json({ error: "Cannot find this email address" })
  }
  try {
    if (await bcrypt.compare(req.body.password, user.password)) {
      (req.session as any).isAuth = true;
      (req.session as any).email = req.body.email;
      return res.send("Success")
    } else {
      return res.status(401).json({ error: "Incorrect Password" })
    }
  }
  catch (e) {
    return res.status(500).end()
  }

})

app.get(`${baseApiUrl}/users/sendRecoveryEmail/:email`, async (req, res) => {
  const users = await collections.users?.find().toArray()!
  const user = users.find((user) => user.email === req.params.email)
  if (!user) {
    return res.status(400).json({ error: "A user does not exist with this email address" })
  }

  const randomId = uuidv4()
  const email = req.params.email
  const template_params = {
    reset_password_link: isProductionEnv ? `yugiohdrafter.com/resetPassword/${randomId}` : `localhost:3000/resetPassword/${randomId}`,
    send_to: email
  }

  var data = {
    service_id: emailkey.SERVICE_ID,
    template_id: emailkey.TEMPLATE_ID,
    user_id: emailkey.USER_ID,
    template_params,
    accessToken: "fd5a6b1c8fb97909cddadeaa79c74dbd"
  };

  const headers = { 'Content-Type': 'application/json' }
  axios.post('https://api.emailjs.com/api/v1.0/email/send', JSON.stringify(data), { headers })
    .then((response: any) => {
      console.log(response)
      resetPasswordDict[randomId] = email
      console.log(resetPasswordDict)
      res.send("Success")
    })
    .catch((err: any) => {
      res.status(500).send(err.response.data)
    });
})

app.post(`${baseApiUrl}/users/resetPassword`, async (req, res) => {
  console.log(resetPasswordDict)
  const email = resetPasswordDict[req.body.uuid]
  if(!email) {
    return res.status(401).json({ error: "No email recovery sent for this account." })
  }
  const users = await collections.users?.find().toArray()!
  const user = users.find((user) => user.email === email)
  if (!user) {
    return res.status(400).json({ error: "Cannot find this email address" })
  }
  try {
    const salt = await bcrypt.genSalt()
    const hashedPassword = await bcrypt.hash(req.body.password, salt)
    const dbResult = await collections.users?.updateOne({email}, {$set: { password: hashedPassword}})

    if (dbResult?.result.ok) {
      (req.session as any).isAuth = true;
      (req.session as any).email = email;
    }
    else
      return res.status(500).json({ error: `Could not update password '. ${dbResult?.result}` })
    return res.json(dbResult);
  }
  catch (e) {
    return res.status(500).end();
  }

})
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
  if (req.body.player.name !== undefined)
    roomPlayers.byId[req.body.player.ip + "-" + req.params.id].name = req.body.player.name
  if (req.body.player.isReady !== undefined)
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
    card_ids: b.card_ids
  }
  const dbResult = await collections.cardSets?.insertOne(customSet)

  if (dbResult?.result.ok)
    res.json(customSet)
  else
    res.json({ error: `Could not insert card set '${req.body.set_name}'. ${dbResult?.result}` })
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
  const setsFromDb = await collections.cardSets?.find().toArray()
  return res.json(setsFromDb)
})

// - start application
const PORT = 8000
const envString = isProductionEnv ? 'Production' : 'Development'
const serverStartMessage = `⚡️[server]: ${envString} server is running at https://localhost:${PORT}`

connectToDatabase()
app.listen(PORT, () => { console.log(serverStartMessage) })
