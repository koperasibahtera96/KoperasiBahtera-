import { type NextRequest, NextResponse } from "next/server"
import { Member } from "@/lib/models"
import { ensureConnection } from "@/lib/utils/database"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureConnection()
    const member = await Member.findOne({ id: params.id }).lean()
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }
    return NextResponse.json(member)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch member" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureConnection()
    const body = await request.json()
    const member = await Member.findOneAndUpdate({ id: params.id }, body, { new: true })
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }
    return NextResponse.json(member)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureConnection()
    const member = await Member.findOneAndDelete({ id: params.id })
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }
    return NextResponse.json({ message: "Member deleted successfully" })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 })
  }
}
