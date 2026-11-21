import { MongoClient } from "mongodb";
import { env } from "./env.js";

let db;
let connecting;

async function createIndexes(database) {
  await Promise.all([
    database.collection("equipment").createIndexes([
      { key: { status: 1, createdAt: -1 } },
      { key: { category: 1 } },
      { key: { ownerId: 1 } },
    ]),
    database.collection("bookings").createIndexes([
      { key: { customerId: 1, createdAt: -1 } },
      { key: { ownerId: 1, createdAt: -1 } },
      { key: { equipmentId: 1, startDate: 1, endDate: 1 } },
    ]),
    database.collection("favorites").createIndex({ userId: 1, equipmentId: 1 }, { unique: true }),
    database.collection("payments").createIndex({ sessionId: 1 }, { unique: true }),
  ]);
}

/** Connects once and reuses the connection (works for servers and serverless). */
export function connectDB() {
  if (db) return Promise.resolve(db);
  if (!connecting) {
    const client = new MongoClient(env.mongoUri);
    connecting = client
      .connect()
      .then(async () => {
        db = client.db(env.dbName);
        await createIndexes(db);
        console.log(`MongoDB connected (${env.dbName})`);
        return db;
      })
      .catch((err) => {
        connecting = null;
        throw err;
      });
  }
  return connecting;
}

export const getDB = () => {
  if (!db) throw new Error("Database not connected");
  return db;
};

/** Collection accessors. `user` is owned by Better Auth (client app). */
export const col = {
  users: () => getDB().collection("user"),
  equipment: () => getDB().collection("equipment"),
  bookings: () => getDB().collection("bookings"),
  favorites: () => getDB().collection("favorites"),
  payments: () => getDB().collection("payments"),
};
