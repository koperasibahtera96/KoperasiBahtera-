import mongoose, { Schema, type Document } from "mongoose";

export interface IPlantAssignment extends Document {
  plantInstanceIds: string[];
  assignedTo: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  assignedRole: "asisten" | "mandor";
  assignedAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlantAssignmentSchema = new Schema(
  {
    plantInstanceIds: {
      type: [String],
      required: true,
      default: [],
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedRole: {
      type: String,
      enum: ["asisten", "mandor"],
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
PlantAssignmentSchema.index({ assignedTo: 1, isActive: 1 });
PlantAssignmentSchema.index({ assignedBy: 1, isActive: 1 });
PlantAssignmentSchema.index({ plantInstanceIds: 1 });

export default mongoose.models.PlantAssignment ||
  mongoose.model<IPlantAssignment>("PlantAssignment", PlantAssignmentSchema);
