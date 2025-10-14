import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  let targetConnection: mongoose.Connection | null = null;
  
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const backupFile = formData.get('backupFile') as File;
    const targetConnectionString = formData.get('targetConnectionString') as string;

    if (!backupFile) {
      return NextResponse.json(
        { error: "No backup file provided" },
        { status: 400 }
      );
    }

    if (!targetConnectionString) {
      return NextResponse.json(
        { error: "No target connection string provided" },
        { status: 400 }
      );
    }

    // Read and parse the backup file
    const backupText = await backupFile.text();
    let backupData;
    
    try {
      backupData = JSON.parse(backupText);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON format in backup file" },
        { status: 400 }
      );
    }

    if (!backupData.data || typeof backupData.data !== 'object') {
      return NextResponse.json(
        { error: "Invalid backup file format - missing data section" },
        { status: 400 }
      );
    }

    // Connect to target database
    try {
      targetConnection = mongoose.createConnection(targetConnectionString);
      
      await new Promise((resolve, reject) => {
        targetConnection!.once('open', resolve);
        targetConnection!.once('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      });

      console.log(`Connected to target database: ${targetConnection.db?.databaseName}`);
    } catch (error) {
      console.error("Failed to connect to target database:", error);
      return NextResponse.json(
        { error: "Failed to connect to target database. Please check your connection string." },
        { status: 400 }
      );
    }

    const targetDb = targetConnection.db;
    if (!targetDb) {
      return NextResponse.json(
        { error: "Target database connection not available" },
        { status: 500 }
      );
    }

    const restoredCollections: Record<string, number> = {};
    const errors: string[] = [];

    // Restore data to each collection
    for (const [collectionName, documents] of Object.entries(backupData.data)) {
      if (!Array.isArray(documents)) {
        errors.push(`Collection ${collectionName}: Invalid data format`);
        continue;
      }

      if (documents.length === 0) {
        console.log(`Skipping empty collection: ${collectionName}`);
        restoredCollections[collectionName] = 0;
        continue;
      }

      try {
        console.log(`Restoring collection: ${collectionName} (${documents.length} documents)`);
        
        // Drop existing collection to ensure clean restore
        try {
          await targetDb.collection(collectionName).drop();
          console.log(`Dropped existing collection: ${collectionName}`);
        } catch {
          // Collection might not exist, that's fine
          console.log(`Collection ${collectionName} didn't exist or couldn't be dropped`);
        }

        // Insert all documents
        if (documents.length > 0) {
          const result = await targetDb.collection(collectionName).insertMany(documents, { ordered: false });
          restoredCollections[collectionName] = result.insertedCount;
          console.log(`Restored ${result.insertedCount} documents to ${collectionName}`);
        }
      } catch (error) {
        console.error(`Error restoring collection ${collectionName}:`, error);
        errors.push(`Collection ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        restoredCollections[collectionName] = 0;
      }
    }

    // Close target connection
    await targetConnection.close();

    const totalRestored = Object.values(restoredCollections).reduce((sum, count) => sum + count, 0);

    const response = {
      success: true,
      message: `Database restore completed. ${totalRestored} documents restored across ${Object.keys(restoredCollections).length} collections.`,
      details: {
        targetDatabase: targetDb.databaseName,
        restoredCollections,
        totalDocuments: totalRestored,
        errors: errors.length > 0 ? errors : undefined,
        restoredAt: new Date().toISOString(),
        restoredBy: session.user?.email || 'admin'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Database restore error:", error);
    
    // Close target connection if it was created
    if (targetConnection) {
      try {
        await targetConnection.close();
      } catch (closeError) {
        console.error("Error closing target connection:", closeError);
      }
    }
    
    return NextResponse.json(
      { error: "Failed to restore database backup" },
      { status: 500 }
    );
  }
}