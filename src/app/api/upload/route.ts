import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Upload API called")

    // const publicKey = "public_YSUgdBW9SG/sVApBODMizBBSHIc="
    const privateKey = "private_nmGGpZ++RRY1MW+OetGD6yr63wE="
    // const urlEndpoint = "https://ik.imagekit.io/niyfabfxr/"

    console.log("[v0] Parsing form data")
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      console.log("[v0] No file provided")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("[v0] File received:", file.name, file.size, file.type)

    console.log("[v0] Converting file to buffer")
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const timestamp = Date.now()
    const fileName = `plant-${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`

    console.log("[v0] Uploading to ImageKit via REST API...")

    const uploadFormData = new FormData()
    uploadFormData.append("file", new Blob([buffer], { type: file.type }), fileName)
    uploadFormData.append("fileName", fileName)
    uploadFormData.append("folder", "/plant-photos")
    uploadFormData.append("tags", "plant,report")

    const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`,
      },
      body: uploadFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log("[v0] ImageKit API error:", response.status, errorText)
      throw new Error(`ImageKit API error: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    console.log("[v0] ImageKit upload successful:", result.url)

    return NextResponse.json({
      success: true,
      imageUrl: result.url,
      fileId: result.fileId,
    })
  } catch (error) {
    console.error("[v0] Upload error occurred:", error)
    console.error("[v0] Error type:", typeof error)
    console.error("[v0] Error constructor:", error?.constructor?.name)

    let errorMessage = "Unknown error"
    try {
      if (error instanceof Error) {
        errorMessage = error.message
        console.error("[v0] Error message:", errorMessage)
        console.error("[v0] Error stack:", error.stack)
      } else {
        errorMessage = String(error)
        console.error("[v0] Non-Error object:", errorMessage)
      }
    } catch (stringifyError) {
      console.error("[v0] Error stringifying error:", stringifyError)
      errorMessage = "Error occurred but could not be serialized"
    }

    return NextResponse.json(
      {
        error: "Upload failed",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
