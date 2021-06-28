import { randomUUID } from "crypto";

// - global constants
export const ROOM_DEFAULT_EXPIRATION = 30 // 30 minutes
const RETRY_ID_COLLISIONS_NUM = 3 // even with 4-char strings, more than 3 collision is highly unlikely

export function unique4CharString(byId: {[id: string]: {}}) { // generate uuid and use first 4 characters
  for (let i = 0; i < RETRY_ID_COLLISIONS_NUM; i++) {
    const id = randomUUID().substring(0, 4) // 4 char  
    
    if (!byId[id]) // no collision, return id
      return id
  }
   
  // - more collisions than allowed RETRY_ID_COLLISIONS_NUM, log error and return null
  console.error(`Error: 'unique4CharString' had more than ${RETRY_ID_COLLISIONS_NUM} collsions.`) 
  throw new Error(`Error: 'unique4CharString' had more than ${RETRY_ID_COLLISIONS_NUM} collsions.`)
}