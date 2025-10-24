"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface User {
  _id: string;
  fullName: string;
  email: string;
}

interface FilterSidebarProps {
  userRole: "manajer" | "asisten" | "mandor";
  selectedFilter: {
    role: "asisten" | "mandor" | "no-group" | null;
    userId: string | null;
  };
  onFilterChange: (filter: {
    role: "asisten" | "mandor" | "no-group" | null;
    userId: string | null;
  }) => void;
}

export default function FilterSidebar({
  userRole,
  selectedFilter,
  onFilterChange,
}: FilterSidebarProps) {
  const [asistenList, setAsistenList] = useState<User[]>([]);
  const [mandorList, setMandorList] = useState<User[]>([]);
  const [showAllAsisten, setShowAllAsisten] = useState(false);
  const [showAllMandor, setShowAllMandor] = useState(false);
  const [loading, setLoading] = useState(true);

  const INITIAL_DISPLAY = 5;

  useEffect(() => {
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  const fetchAssignments = async () => {
    try {
      const res = await fetch("/api/assignments");
      if (res.ok) {
        const data = await res.json();
        const assignments = data.assignments || [];

        if (userRole === "manajer") {
          // Get asisten assignments
          const asistenAssignments = assignments.filter(
            (a: any) => a.assignedRole === "asisten"
          );
          const asistenUsers = asistenAssignments.map((a: any) => ({
            _id: a.assignedTo._id,
            fullName: a.assignedTo.fullName,
            email: a.assignedTo.email,
          }));
          setAsistenList(asistenUsers);

          // Get all mandor assignments (from all asisten)
          const mandorAssignments = assignments.filter(
            (a: any) => a.assignedRole === "mandor"
          );
          const uniqueMandors = new Map<string, User>();
          mandorAssignments.forEach((a: any) => {
            if (!uniqueMandors.has(a.assignedTo._id)) {
              uniqueMandors.set(a.assignedTo._id, {
                _id: a.assignedTo._id,
                fullName: a.assignedTo.fullName,
                email: a.assignedTo.email,
              });
            }
          });
          setMandorList(Array.from(uniqueMandors.values()));
        } else if (userRole === "asisten") {
          // Get mandor assignments created by this asisten
          const mandorAssignments = assignments.filter(
            (a: any) => a.assignedRole === "mandor"
          );
          const mandorUsers = mandorAssignments.map((a: any) => ({
            _id: a.assignedTo._id,
            fullName: a.assignedTo.fullName,
            email: a.assignedTo.email,
          }));
          setMandorList(mandorUsers);
        }
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (
    role: "asisten" | "mandor" | "no-group",
    userId: string | null
  ) => {
    // If clicking the same checkbox, keep it selected (can't deselect)
    onFilterChange({ role, userId });
  };

  const displayedAsisten = showAllAsisten
    ? asistenList
    : asistenList.slice(0, INITIAL_DISPLAY);
  const displayedMandor = showAllMandor
    ? mandorList
    : mandorList.slice(0, INITIAL_DISPLAY);

  if (loading) {
    return (
      <div className="w-64 bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-[#324D3E]/10 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[#324D3E]/20 rounded w-3/4"></div>
          <div className="h-4 bg-[#324D3E]/20 rounded w-1/2"></div>
          <div className="h-4 bg-[#324D3E]/20 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-[#324D3E]/10 p-6 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
      <h3 className="text-lg font-bold text-[#324D3E] mb-4">Filter Data</h3>

      {/* No Group Option */}
      <div className="mb-6">
        <label className="flex items-center space-x-3 p-3 rounded-lg hover:bg-[#324D3E]/5 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={selectedFilter.role === "no-group"}
            onChange={() => handleCheckboxChange("no-group", null)}
            className="w-4 h-4 text-[#324D3E] border-[#324D3E]/30 rounded focus:ring-[#324D3E] focus:ring-2"
          />
          <span className="text-sm font-medium text-[#324D3E]">
            {userRole === "manajer"
              ? "Belum Ditetapkan"
              : "Belum Ditetapkan Mandor"}
          </span>
        </label>
      </div>

      {/* Asisten Section (Manajer only) */}
      {userRole === "manajer" && asistenList.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-[#889063] mb-3 uppercase tracking-wide">
            Filter by Asisten
          </h4>
          <div className="space-y-2">
            {displayedAsisten.map((asisten) => (
              <label
                key={asisten._id}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-[#324D3E]/5 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={
                    selectedFilter.role === "asisten" &&
                    selectedFilter.userId === asisten._id
                  }
                  onChange={() => handleCheckboxChange("asisten", asisten._id)}
                  className="w-4 h-4 text-[#324D3E] border-[#324D3E]/30 rounded focus:ring-[#324D3E] focus:ring-2"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#324D3E] truncate">
                    {asisten.fullName}
                  </p>
                  <p className="text-xs text-[#889063] truncate">
                    {asisten.email}
                  </p>
                </div>
              </label>
            ))}

            {asistenList.length > INITIAL_DISPLAY && (
              <button
                onClick={() => setShowAllAsisten(!showAllAsisten)}
                className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-[#324D3E] hover:bg-[#324D3E]/5 rounded-lg transition-colors"
              >
                {showAllAsisten ? (
                  <>
                    <span>Show Less</span>
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>
                      View More ({asistenList.length - INITIAL_DISPLAY})
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mandor Section */}
      {(userRole === "manajer" || userRole === "asisten") &&
        mandorList.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-[#889063] mb-3 uppercase tracking-wide">
              Filter by Mandor
            </h4>
            <div className="space-y-2">
              {displayedMandor.map((mandor) => (
                <label
                  key={mandor._id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-[#324D3E]/5 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={
                      selectedFilter.role === "mandor" &&
                      selectedFilter.userId === mandor._id
                    }
                    onChange={() => handleCheckboxChange("mandor", mandor._id)}
                    className="w-4 h-4 text-[#324D3E] border-[#324D3E]/30 rounded focus:ring-[#324D3E] focus:ring-2"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#324D3E] truncate">
                      {mandor.fullName}
                    </p>
                    <p className="text-xs text-[#889063] truncate">
                      {mandor.email}
                    </p>
                  </div>
                </label>
              ))}

              {mandorList.length > INITIAL_DISPLAY && (
                <button
                  onClick={() => setShowAllMandor(!showAllMandor)}
                  className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-[#324D3E] hover:bg-[#324D3E]/5 rounded-lg transition-colors"
                >
                  {showAllMandor ? (
                    <>
                      <span>Show Less</span>
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>
                        View More ({mandorList.length - INITIAL_DISPLAY})
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
    </div>
  );
}
