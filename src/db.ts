import { Collection, Db, MongoClient } from "mongodb";
import { CardSet } from "./models/CardSet";
import { User } from "./models/User";


// Global Variables
export const collections: { cardSets?: Collection<CardSet>, users?: Collection<User> } = {}

// Initialize Connection
// - initialize mongo db client
export async function connectToDatabase () {

  const client: MongoClient = new MongoClient('mongodb://localhost:27017/yugiohdrafter');
          
  await client.connect();
      
  const db: Db = client.db('yugiohdrafter');
 
  const cardSetsCollection: Collection = db.collection('cardSets');
  collections.cardSets = cardSetsCollection;

  const usersCollection: Collection = db.collection('users');
  collections.users = usersCollection;
     
  console.log(`Successfully connected to database: ${db.databaseName}`);
}