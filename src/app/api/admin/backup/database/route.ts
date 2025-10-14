import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";

export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    // Connect to the app's database
    await dbConnect();
    
    // Wait for connection to be ready with retry
    let retries = 0;
    const maxRetries = 5;
    
    while (mongoose.connection.readyState !== 1 && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      retries++;
    }
    
    if (mongoose.connection.readyState !== 1) {
      return NextResponse.json(
        { error: "Database connection not ready. Please try again." },
        { status: 500 }
      );
    }
    
    const db = mongoose.connection.db;
    
    if (!db) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    console.log('Backing up database:', db.databaseName);

    // Try to get collections from listCollections first
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections via listCollections:`, collections.map((c: any) => c.name));
    
    // If no collections found via listCollections, try getting them from mongoose models
    if (collections.length === 0) {
      console.log('No collections found via listCollections, trying mongoose.connection.models...');
      const modelNames = Object.keys(mongoose.connection.models);
      console.log('Available mongoose models:', modelNames);
      
      // Try to get collection names from models
      for (const modelName of modelNames) {
        const model = mongoose.connection.models[modelName];
        if (model && model.collection) {
          collections.push({ name: model.collection.name });
        }
      }
      console.log(`Found ${collections.length} collections from models:`, collections.map((c: any) => c.name));
    }
    
    const backupData: Record<string, any[]> = {};
    
    // Export data from each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      
      // Skip system collections
      if (collectionName.startsWith('system.')) {
        console.log(`Skipping system collection: ${collectionName}`);
        continue;
      }
      
      try {
        console.log(`Backing up collection: ${collectionName}`);
        const data = await db.collection(collectionName).find({}).toArray();
        console.log(`Collection ${collectionName} has ${data.length} documents`);
        backupData[collectionName] = data;
      } catch (error) {
        console.error(`Error backing up collection ${collectionName}:`, error);
        // Continue with other collections even if one fails
        backupData[collectionName] = [];
      }
    }

    console.log(`Total collections backed up: ${Object.keys(backupData).length}`);

    // Add metadata to the backup
    const backup = {
      metadata: {
        exportDate: new Date().toISOString(),
        databaseName: db.databaseName,
        totalCollections: Object.keys(backupData).length,
        totalDocuments: Object.values(backupData).reduce((sum, docs) => sum + docs.length, 0),
        exportedBy: session.user?.email || "admin",
        connectionInfo: {
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          name: mongoose.connection.name,
        },
      },
      data: backupData,
    };

    // Convert to JSON string
    const jsonData = JSON.stringify(backup, null, 2);
    
    // Create response with proper headers for file download
    const response = new NextResponse(jsonData, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="database-backup-${
          new Date().toISOString().split("T")[0]
        }.json"`,
      },
    });

    return response;

  } catch (error) {
    console.error("Database backup error:", error);
    
    return NextResponse.json(
      { error: "Failed to create database backup" },
      { status: 500 }
    );
  }
}