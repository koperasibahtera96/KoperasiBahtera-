import mongoose from "mongoose"

const HistorySchema = new mongoose.Schema({
  id: { type: Number, required: true },
  type: { type: String, required: true },
  date: { type: String, required: true },
  description: { type: String, required: true },
  hasImage: { type: Boolean, default: false },
  imageUrl: { type: String, default: null },
})

const PlantSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    qrCode: { type: String, required: true, unique: true },
    owner: { type: String, required: true },
    fotoGambar: { type: String, default: null },
    memberId: { type: String, required: true },
    contractNumber: { type: String, required: true },
    location: { type: String, required: true },
    plantType: { type: String, required: true },
    status: { type: String, required: true },
    lastUpdate: { type: String, required: true },
    history: [HistorySchema],
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.Plant || mongoose.model("Plant", PlantSchema)
