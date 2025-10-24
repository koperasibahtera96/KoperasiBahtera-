import { ensureConnection } from "@/lib/utils/database";
import { PlantInstance } from "@/models";
import PlantAssignment from "@/models/PlantAssignment";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await ensureConnection();

    const { searchParams } = new URL(req.url);

    // Optional filtering parameters (EXACT SAME as client logic)
    const search = searchParams.get("search");
    const plantType = searchParams.get("plantType");
    const statusFilter = searchParams.get("statusFilter"); // "new" | "problem" | "all"
    const filterByRole = searchParams.get("filterByRole"); // "asisten" | "mandor"
    const filterByUserId = searchParams.get("filterByUserId"); // User ID to filter by
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Number.parseInt(searchParams.get("limit") || "0", 10);

    // Get session for role-based access
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    // Determine which plantIds user has access to
    let accessiblePlantIds: string[] | null = null;

    if (userRole === "asisten" || userRole === "mandor") {
      const assignmentRole = userRole === "asisten" ? "asisten" : "mandor";
      const myAssignment = await PlantAssignment.findOne({
        assignedTo: userId,
        assignedRole: assignmentRole,
        isActive: true,
      });
      accessiblePlantIds = myAssignment?.plantInstanceIds || [];
    }
    // For manajer, admin, staff, etc. - see all plants (accessiblePlantIds = null)

    // Build query
    const query: any = {};

    // Apply accessible plant IDs filter
    if (accessiblePlantIds !== null) {
      if (accessiblePlantIds.length === 0) {
        return NextResponse.json({
          plants: [],
          pagination: { total: 0, page, limit, totalPages: 0 },
        });
      }
      query.id = { $in: accessiblePlantIds };
    }

    // Apply filter by specific asisten/mandor (for sidebar filtering)
    if (filterByRole && filterByUserId) {
      const filterAssignment = await PlantAssignment.findOne({
        assignedTo: filterByUserId,
        assignedRole: filterByRole,
        isActive: true,
      });

      const filteredPlantIds = filterAssignment?.plantInstanceIds || [];

      if (filteredPlantIds.length === 0) {
        return NextResponse.json({
          plants: [],
          pagination: { total: 0, page, limit, totalPages: 0 },
        });
      }

      // Intersect with accessible plants if applicable
      if (query.id?.$in) {
        query.id.$in = query.id.$in.filter((id: string) =>
          filteredPlantIds.includes(id)
        );
      } else {
        query.id = { $in: filteredPlantIds };
      }
    }

    // Filter by plantType (EXACT SAME as client)
    if (plantType) {
      query.plantType = new RegExp(`^${plantType}$`, "i");
    }

    // Search filter (EXACT SAME as client)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { instanceName: searchRegex },
        { owner: searchRegex },
        { memberId: searchRegex },
      ];
    }

    // Execute query
    const total = await PlantInstance.countDocuments(query);

    let plantsQuery = PlantInstance.find(query).lean();

    // Apply pagination if limit > 0
    if (limit > 0) {
      const skip = (page - 1) * limit;
      plantsQuery = plantsQuery.skip(skip).limit(limit);
    }

    let plants = await plantsQuery;

    // Apply status filters (EXACT SAME logic as client)
    if (statusFilter === "new") {
      plants = plants.filter((plant: any) => isPlantNew(plant));
    } else if (statusFilter === "problem") {
      plants = plants.filter((plant: any) => isPlantProblem(plant));
    }

    // Return with pagination if limit specified
    if (limit > 0) {
      const totalPages = Math.ceil(total / limit);
      return NextResponse.json({
        plants,
        pagination: { total, page, limit, totalPages },
      });
    }

    // Backward compatibility - return plain array
    return NextResponse.json(plants);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch plants" },
      { status: 500 }
    );
  }
}

// Helper functions (EXACT SAME as client)
function parseIDDate(d: string): Date {
  const [dd, mm, yyyy] = d.split("/");
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function isWithinDays(dateStr: string, days: number): boolean {
  const d = parseIDDate(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const limit = days * 24 * 60 * 60 * 1000;
  return diff >= 0 && diff <= limit;
}

function isPlantNew(plant: any): boolean {
  const pending = (plant.history || []).find((h: any) => {
    const t = String(h?.type || "").toLowerCase();
    const a = String(h?.action || "").toLowerCase();
    return t === "pending contract" || a === "pending contract";
  });

  return !!(pending && pending.date && isWithinDays(pending.date, 14));
}

function isPlantProblem(plant: any): boolean {
  const history = plant.history || [];
  if (!history.length) return false;

  const latest = [...history].sort((a, b) => {
    const ta = parseIDDate(a.date).getTime();
    const tb = parseIDDate(b.date).getTime();
    if (ta !== tb) return tb - ta;
    return (b.id ?? 0) - (a.id ?? 0);
  })[0];

  return !!(latest && (latest.type || "").toLowerCase() === "sakit");
}

export async function POST(request: NextRequest) {
  try {
    await ensureConnection();
    const body = await request.json();

    // Set default kavling value if not provided
    if (!body.kavling) {
      body.kavling = "-";
    }

    const plant = new PlantInstance(body);
    await plant.save();
    return NextResponse.json(plant, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create plant" },
      { status: 500 }
    );
  }
}
