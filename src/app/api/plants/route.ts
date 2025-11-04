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
    const excludeAssigned = searchParams.get("excludeAssigned") === "true"; // For "no-group" filter
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
      console.log('\n=== ROLE/USER FILTER DEBUG ===');
      console.log(`Filtering by role: ${filterByRole}, userId: ${filterByUserId}`);
      
      const filterAssignment = await PlantAssignment.findOne({
        assignedTo: filterByUserId,
        assignedRole: filterByRole,
        isActive: true,
      });
      console.log(`Found assignment:`, filterAssignment ? 'Yes' : 'No');

      const filteredPlantIds = filterAssignment?.plantInstanceIds || [];
      console.log(`Plants assigned to this user: ${filteredPlantIds.length}`);
      console.log('Plant IDs:', filteredPlantIds);

      if (filteredPlantIds.length === 0) {
        console.log('No plants assigned to this user - returning empty');
        console.log('=== END ROLE/USER FILTER ===\n');
        return NextResponse.json({
          plants: [],
          pagination: { total: 0, page, limit, totalPages: 0 },
        });
      }

      // Intersect with accessible plants if applicable
      if (query.id?.$in) {
        console.log('Intersecting with existing $in filter');
        query.id.$in = query.id.$in.filter((id: string) =>
          filteredPlantIds.includes(id)
        );
      } else {
        console.log('Setting $in filter to only show assigned plants');
        query.id = { $in: filteredPlantIds };
      }
      console.log('=== END ROLE/USER FILTER ===\n');
    }

    // Apply "no-group" filter (exclude all assigned plants)
    if (excludeAssigned) {
      console.log('\n=== NO-GROUP FILTER DEBUG ===');
      // Get all assigned plant IDs from all assignments
      const allAssignments = await PlantAssignment.find({ isActive: true }).lean();
      console.log(`Found ${allAssignments.length} active assignments`);
      
      const allAssignedPlantIds = allAssignments.flatMap(
        (a: any) => a.plantInstanceIds || []
      );
      console.log(`Total plant ID entries (with duplicates): ${allAssignedPlantIds.length}`);
      console.log('All assigned plant IDs:', allAssignedPlantIds);

      if (allAssignedPlantIds.length > 0) {
        // Remove duplicates - a plant can be assigned to multiple people
        const uniqueIds = [...new Set(allAssignedPlantIds)];
        console.log(`Unique assigned plant IDs: ${uniqueIds.length}`);
        console.log('Unique plant IDs:', uniqueIds);
        
        // Exclude assigned plants
        if (query.id?.$in) {
          console.log('Using $in intersection (rare case)');
          // If there's already an $in filter, intersect with non-assigned plants
          query.id.$in = query.id.$in.filter(
            (id: string) => !uniqueIds.includes(id)
          );
        } else {
          console.log('Using $nin to exclude assigned plants');
          // Exclude assigned plants using $nin
          query.id = { $nin: uniqueIds };
        }
      }
      console.log('=== END NO-GROUP FILTER ===\n');
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

    // Execute query to get all matching plants
    if (excludeAssigned) {
      console.log('MongoDB query for no-group:', JSON.stringify(query, null, 2));
    }
    if (filterByRole && filterByUserId) {
      console.log('MongoDB query for role/user filter:', JSON.stringify(query, null, 2));
    }
    
    let plants = await PlantInstance.find(query).lean();
    
    if (excludeAssigned) {
      console.log(`MongoDB returned ${plants.length} plants (should be unassigned only)`);
      console.log('First few plant IDs returned:', plants.slice(0, 5).map((p: any) => p.id));
      
      // Verify that none of the returned plants are in the assigned list
      const query$nin = (query.id as any)?.$nin || [];
      const hasAssignedPlant = plants.some((p: any) => query$nin.includes(p.id));
      if (hasAssignedPlant) {
        console.error('❌ ERROR: Found assigned plant in results!');
      } else {
        console.log('✅ Verified: No assigned plants in results');
      }
    }
    
    if (filterByRole && filterByUserId) {
      console.log(`MongoDB returned ${plants.length} plants for this ${filterByRole}`);
      console.log('Plant IDs returned:', plants.map((p: any) => p.id));
      
      // Verify all returned plants are in the allowed list
      const allowedIds = (query.id as any)?.$in || [];
      const hasUnauthorizedPlant = plants.some((p: any) => !allowedIds.includes(p.id));
      if (hasUnauthorizedPlant) {
        console.error('❌ ERROR: Found unauthorized plant in results!');
      } else {
        console.log('✅ Verified: All plants belong to this user');
      }
    }

    // Apply status filters (EXACT SAME logic as client)
    if (statusFilter === "new") {
      plants = plants.filter((plant: any) => isPlantNew(plant));
    } else if (statusFilter === "problem") {
      plants = plants.filter((plant: any) => isPlantProblem(plant));
    }

    // Calculate total AFTER status filtering
    const total = plants.length;

    // Apply pagination if limit > 0
    if (limit > 0) {
      const skip = (page - 1) * limit;
      const paginatedPlants = plants.slice(skip, skip + limit);
      const totalPages = Math.ceil(total / limit);
      return NextResponse.json({
        plants: paginatedPlants,
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
