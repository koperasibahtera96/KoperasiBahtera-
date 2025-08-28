import { type NextRequest, NextResponse } from "next/server"
import { Member } from "@/lib/models"
import { ensureConnection } from "@/lib/utils/database"

export async function GET() {
  try {
    await ensureConnection()
    const members = await Member.find({}).lean()
    return NextResponse.json(members)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureConnection()
    const body = await request.json()
    const member = new Member(body)
    await member.save()
    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create member" }, { status: 500 })
  }
}
