import { AdminLog, Investor, PlantType } from "@/models";
import Contract from "@/models/Contract";
import FilteredWord from "@/models/FilteredWord";
import Payment from "@/models/Payment"; // adjust path
import Plant from "@/models/Plant"; // adjust path
import PlantAssignment from "@/models/PlantAssignment";
import PlantInstance from "@/models/PlantInstance";
import ResubmissionRequest from "@/models/ResubmissionRequest";
import Review from "@/models/Review";
import Settings from "@/models/Settings";
import User from "@/models/User"; // adjust path
import WhatsAppSession from "@/models/WhatsAppSession";
import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://BenZeta:BenZeta@benzeta.lfcf6it.mongodb.net/tanaman-hijau?retryWrites=true&w=majority";
if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then(async (mongoose) => {
        // ✅ Sync indexes to match current schema (removes old conflicting indexes)
        await User.syncIndexes();
        await Plant.syncIndexes();
        await Investor.syncIndexes();
        await PlantType.syncIndexes();
        await Payment.syncIndexes();
        await PlantInstance.syncIndexes();
        await Review.syncIndexes();
        await FilteredWord.syncIndexes();
        await WhatsAppSession.syncIndexes();
        await Settings.syncIndexes();
        await AdminLog.syncIndexes();
        await Contract.syncIndexes();
        await ResubmissionRequest.syncIndexes();
        await PlantAssignment.syncIndexes();
        return mongoose;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
