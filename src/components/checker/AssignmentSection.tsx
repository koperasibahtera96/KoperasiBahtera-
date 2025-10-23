"use client";

import { Button } from "@/components/ui-staff/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui-staff/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-staff/select";
import { useAlert } from "@/components/ui/Alert";
import { Users, UserPlus, X, UserCheck, ArrowDown } from "lucide-react";
import { useEffect, useState } from "react";

interface User {
  _id: string;
  fullName: string;
  email: string;
  role: string;
}

interface Assignment {
  _id: string;
  plantInstanceIds: string[];
  assignedTo: User;
  assignedBy: User;
  assignedRole: string;
  assignedAt: string;
  isActive: boolean;
}

interface AssignmentSectionProps {
  plantId: string;
  userRole: string;
  userId: string;
}

export default function AssignmentSection({
  plantId,
  userRole,
  userId,
}: AssignmentSectionProps) {
  const [myAssignment, setMyAssignment] = useState<Assignment | null>(null); // Who assigned me
  const [assignedByMe, setAssignedByMe] = useState<Assignment[]>([]); // Who I assigned
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showSuccess, showError, showConfirmation, AlertComponent } =
    useAlert();

  // Determine what role I can assign
  const assigningRole = userRole === "manajer" ? "asisten" : "mandor";

  useEffect(() => {
    fetchAssignments();
    if (userRole === "manajer" || userRole === "asisten") {
      fetchAvailableUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantId, userId]);

  const fetchAssignments = async () => {
    try {
      const res = await fetch("/api/assignments");
      if (res.ok) {
        const data = await res.json();
        const allAssignments = data.assignments || [];

        // Filter assignments relevant to this plant
        const plantAssignments = allAssignments.filter((a: Assignment) =>
          a.plantInstanceIds.includes(plantId)
        );

        // Find assignment where I am the assignee (who assigned me)
        const myAssignmentData = plantAssignments.find(
          (a: Assignment) => a.assignedTo._id === userId
        );
        setMyAssignment(myAssignmentData || null);

        // Find assignments where I am the assigner (who I assigned)
        const assignedByMeData = plantAssignments.filter(
          (a: Assignment) => a.assignedBy._id === userId
        );
        setAssignedByMe(assignedByMeData);
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const res = await fetch(`/api/users/by-role?role=${assigningRole}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId) {
      showError("Error", `Silakan pilih ${assigningRole} untuk ditugaskan`);
      return;
    }

    setIsAssigning(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantInstanceIds: [plantId],
          assignedToId: selectedUserId,
          assignedRole: assigningRole,
        }),
      });

      if (res.ok) {
        showSuccess("Berhasil", `${assigningRole} berhasil ditugaskan`);
        setSelectedUserId("");
        fetchAssignments();
      } else {
        const error = await res.json();
        showError("Error", error.error || "Gagal menugaskan");
      }
    } catch (error) {
      console.error("Error assigning:", error);
      showError("Error", "Gagal menugaskan pengguna");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async (assignmentId: string) => {
    const confirmed = await showConfirmation(
      "Hapus Penugasan",
      "Apakah Anda yakin ingin menghapus penugasan ini?",
      { confirmText: "Hapus", cancelText: "Batal", type: "danger" }
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/assignments?id=${assignmentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showSuccess("Berhasil", "Penugasan berhasil dihapus");
        fetchAssignments();
      } else {
        const error = await res.json();
        showError("Error", error.error || "Gagal menghapus penugasan");
      }
    } catch (error) {
      console.error("Error removing assignment:", error);
      showError("Error", "Gagal menghapus penugasan");
    }
  };

  // Only manajer, asisten, and mandor should see this
  if (userRole !== "manajer" && userRole !== "asisten" && userRole !== "mandor") {
    return null;
  }

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Memuat penugasan...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <AlertComponent />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Informasi Penugasan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Section 1: Who assigned ME (for Asisten and Mandor) */}
          {(userRole === "asisten" || userRole === "mandor") && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Ditugaskan oleh:
                </h3>
              </div>
              {myAssignment ? (
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                  <p className="font-medium text-sm text-gray-900 dark:text-white">
                    {myAssignment.assignedBy.fullName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {myAssignment.assignedBy.email} • Peran:{" "}
                    {myAssignment.assignedBy.role}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Ditugaskan pada{" "}
                    {new Date(myAssignment.assignedAt).toLocaleDateString("id-ID")}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tidak ada penugasan untuk tanaman ini
                </p>
              )}
            </div>
          )}

          {/* Arrow separator for Asisten (showing hierarchy) */}
          {userRole === "asisten" && assignedByMe.length > 0 && (
            <div className="flex justify-center">
              <ArrowDown className="w-5 h-5 text-gray-400" />
            </div>
          )}

          {/* Section 2: Who I ASSIGNED (for Manajer and Asisten) */}
          {(userRole === "manajer" || userRole === "asisten") && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {assigningRole === "asisten" ? "Asisten" : "Mandor"} yang Anda tugaskan:
                </h3>
              </div>

              {assignedByMe.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Belum ada {assigningRole} yang ditugaskan
                </p>
              ) : (
                <div className="space-y-2 mb-4">
                  {assignedByMe.map((assignment) => (
                    <div
                      key={assignment._id}
                      className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800"
                    >
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                          {assignment.assignedTo.fullName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {assignment.assignedTo.email}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Ditugaskan pada{" "}
                          {new Date(assignment.assignedAt).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnassign(assignment._id)}
                        className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Assign New */}
              <div className="border-t pt-4 dark:border-gray-700">
                <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                  Tugaskan {assigningRole} baru:
                </h3>
                <div className="flex gap-2">
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={`Pilih ${assigningRole}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((user) => (
                        <SelectItem key={user._id} value={user._id}>
                          {user.fullName} - {user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAssign}
                    disabled={!selectedUserId || isAssigning}
                    className="bg-[#324D3E] hover:bg-[#324D3E]/90"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {isAssigning ? "Menugaskan..." : "Tugaskan"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
