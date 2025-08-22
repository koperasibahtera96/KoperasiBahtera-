import dbConnect from "@/lib/mongodb"
import { handleMongooseError, isMongooseError } from "@/lib/mongooseErrorHandler"
import Plant from "@/models/Plant"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Fetching plants from MongoDB...")
    await dbConnect()
    const plants = await Plant.find({}).sort({ id: 1 })
    console.log(`[v0] Found ${plants.length} plants in MongoDB`)

    return NextResponse.json({
      success: true,
      data: plants
    })
  } catch (error) {
    console.error("[v0] Error reading plants from MongoDB:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch plants"
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const body = await request.json()

    // Validate required fields
    const requiredFields = [
      'name', 'qrCode', 'owner', 'memberId', 'contractNumber',
      'location', 'plantType', 'status', 'lastUpdate', 'height', 'age'
    ]

    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json({
          success: false,
          error: `Field ${field} is required`
        }, { status: 400 })
      }
    }

    // Get the next ID
    const lastPlant = await Plant.findOne().sort({ id: -1 })
    const nextId = lastPlant ? lastPlant.id + 1 : 1

    // Create plant data
    const plantData = {
      id: nextId,
      name: body.name,
      qrCode: body.qrCode,
      owner: body.owner,
      fotoGambar: body.fotoGambar || null,
      memberId: body.memberId,
      contractNumber: body.contractNumber,
      location: body.location,
      plantType: body.plantType,
      status: body.status,
      lastUpdate: body.lastUpdate,
      height: Number(body.height),
      age: Number(body.age),
      history: body.history || []
    }

    const newPlant = new Plant(plantData)
    await newPlant.save()

    console.log(`[v0] Created new plant with ID: ${newPlant.id}`)

    return NextResponse.json({
      success: true,
      data: newPlant,
      message: 'Plant created successfully'
    }, { status: 201 })

  } catch (error: unknown) {
    console.error("[v0] Error creating plant:", error)

    // Check if it's a Mongoose error
    if (isMongooseError(error)) {
      const mongooseResponse = handleMongooseError(error, {
        compoundUniqueConstraints: [
          {
            fields: ['name', 'owner', 'location'],
            message: (values) => `Plant with name "${values.name}" already exists for owner "${values.owner}" at location "${values.location}"`
          }
        ]
      })

      if (mongooseResponse) {
        return mongooseResponse
      }
    }

    // Handle non-Mongoose errors
    if (error && typeof error === 'object' && 'message' in error) {
      return NextResponse.json({
        success: false,
        error: (error as { message: string }).message
      }, { status: 500 })
    }

    // Generic fallback error
    return NextResponse.json({
      success: false,
      error: "Failed to create plant"
    }, { status: 500 })
  }
}
