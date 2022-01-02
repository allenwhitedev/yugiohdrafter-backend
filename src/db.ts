import { Collection, Db, MongoClient } from "mongodb";
import { CardSet } from "./models/CardSet";


// Global Variables
export const collections: { cardSets?: Collection<CardSet> } = {}

// Initialize Connection
// - initialize mongo db client
export async function connectToDatabase () {

  const client: MongoClient = new MongoClient('mongodb://localhost:27017/yugiohdrafter');
          
  await client.connect();
      
  const db: Db = client.db('yugiohdrafter');
 
  const cardSetsCollection: Collection = db.collection('cardSets');

  collections.cardSets = cardSetsCollection;
     
  console.log(`Successfully connected to database: ${db.databaseName} and collection: ${cardSetsCollection.collectionName}`);
}