"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui-staff/badge";
import { Button } from "@/components/ui-staff/button";
import { Input } from "@/components/ui-staff/input";
import { useAlert } from "@/components/ui/Alert";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface AdminLog {
  _id: string;
  adminId: {
    _id: string;
    fullName: string;
    email: string;
    userCode: string;
  };
  adminName: string;
  adminEmail: string;
  action:
    | "create_staff"
    | "update_staff"
    | "delete_staff"
    | "update_plant_prices";
  description: string;
  targetType: "staff" | "plant";
  targetId?: string;
  targetName?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface LogFilters {
  action: string;
  targetType: string;
  dateFrom: string;
  dateTo: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState<LogFilters>({
    action: "",
    targetType: "",
    dateFrom: "",
    dateTo: "",
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const { showError } = useAlert();

  // Fetch logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filters.action) params.append("action", filters.action);
      if (filters.targetType) params.append("targetType", filters.targetType);
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);

      const response = await fetch(`/api/admin/logs?${params}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data);
        setPagination(data.pagination);
      } else {
        showError(data.error || "Failed to fetch logs", "error");
      }
    } catch (error) {
      showError("Error fetching admin logs", "error");
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, filters]);

  const handleFilterChange = (key: keyof LogFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      action: "",
      targetType: "",
      dateFrom: "",
      dateTo: "",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "create_staff":
        return "bg-green-100 text-green-800";
      case "update_staff":
        return "bg-blue-100 text-blue-800";
      case "delete_staff":
        return "bg-red-100 text-red-800";
      case "update_plant_prices":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case "create_staff":
        return "Create Staff";
      case "update_staff":
        return "Update Staff";
      case "delete_staff":
        return "Delete Staff";
      case "update_plant_prices":
        return "Update Plant Prices";
      default:
        return action;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Map of field paths to human-readable labels matching the plant showcase page
  const fieldLabels: Record<string, string> = {
    // Basic info
    name: "Nama Tanaman",
    nameEn: "Nama Inggris",
    years: "Tahun",
    location: "Lokasi",
    description: "Deskripsi",

    // Harga Dasar (Basic Price) section
    "pricing.price10Trees": "Harga 10 Pohon",
    "pricing.price1Tree": "Harga 1 Pohon",

    // Harga Cicilan (Installment) section
    "pricing.installmentPrice10Trees": "Harga Cicilan 10 Pohon",
    "pricing.installmentPrice1Tree": "Harga Cicilan 1 Pohon",

    // Keuntungan (Profit) section
    "pricing.profit.daily": "Keuntungan Harian per Pohon",
    "pricing.profit.weekly": "Keuntungan Mingguan per Pohon",
    "pricing.profit.monthly": "Keuntungan Bulanan per Pohon",
    "pricing.profit.yearly": "Keuntungan Tahunan per Pohon",

    // Estimasi Return
    estimatedReturn: "Proyeksi Keuntungan",

    // Investment Plan fields
    "investmentPlan.name": "Nama Paket",
    "investmentPlan.price": "Harga Paket",
    "investmentPlan.duration": "Durasi",
    "investmentPlan.returns": "Proyeksi Keuntungan",
    "investmentPlan.plantType": "Jenis Tanaman",
    "investmentPlan.riskLevel": "Tingkat Risiko",

    // Installment Options - These will be handled dynamically in the comparison function

    // Features
    "investmentPlan.features": "Fitur Unggulan",
  };

  const getFieldLabel = (path: string): string => {
    return (
      fieldLabels[path] ||
      path
        .split(".")
        .map((part) => {
          // Convert camelCase to Title Case
          const words = part.replace(/([A-Z])/g, " $1");
          return words.charAt(0).toUpperCase() + words.slice(1);
        })
        .join(" ")
    );
  };

  const getPlantChangeSummary = (oldData: any, newData: any) => {
    if (!oldData || !newData) return null;

    const summary: string[] = [];
    const formatCurrency = (value: any) => {
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num);
    };

    // Function to get installment period label
    const getInstallmentPeriod = (options: any[], index: number) => {
      if (!options || !options[index] || !options[index].period) return `Cicilan #${index + 1}`;
      return `Cicilan ${options[index].period}`;
    };

    // Function to compare objects recursively
    const compareObjects = (path: string, obj1: any, obj2: any) => {
      if (obj1 === obj2) return;

      // Handle installment options array specially
      if (path.endsWith('installmentOptions') && Array.isArray(obj1) && Array.isArray(obj2)) {
        const maxLength = Math.max(obj1.length, obj2.length);
        for (let i = 0; i < maxLength; i++) {
          const period = getInstallmentPeriod(obj2.length > i ? obj2 : obj1, i);
          
          if (i < obj1.length && i < obj2.length) {
            // Compare amount
            if (obj1[i].amount !== obj2[i].amount) {
              const oldVal = formatCurrency(obj1[i].amount);
              const newVal = formatCurrency(obj2[i].amount);
              summary.push(`${period} (Jumlah): ${oldVal} → ${newVal}`);
            }
            // Compare perTree
            if (obj1[i].perTree !== obj2[i].perTree) {
              const oldVal = formatCurrency(obj1[i].perTree);
              const newVal = formatCurrency(obj2[i].perTree);
              summary.push(`${period} (per Pohon): ${oldVal} → ${newVal}`);
            }
          } 
          // Handle added items
          else if (i >= obj1.length) {
            const newVal = formatCurrency(obj2[i].perTree);
            summary.push(`${period} (Baru): ${newVal} per pohon`);
          }
          // Handle removed items
          else if (i >= obj2.length) {
            const oldVal = formatCurrency(obj1[i].perTree);
            summary.push(`${period} (Dihapus): ${oldVal} per pohon`);
          }
        }
        return;
      }

      // Handle null/undefined cases
      if (
        obj1 === null ||
        obj2 === null ||
        typeof obj1 !== "object" ||
        typeof obj2 !== "object"
      ) {
        const formattedOld =
          typeof obj1 === "number"
            ? formatCurrency(obj1)
            : obj1?.toString() || "null";
        const formattedNew =
          typeof obj2 === "number"
            ? formatCurrency(obj2)
            : obj2?.toString() || "null";
            
        // Skip internal fields in the path
        if (path.includes('__') || path.includes('_id') || path.includes('updatedAt') || path.includes('createdAt')) {
          return;
        }
        
        const label = getFieldLabel(path);
        summary.push(`${label}: ${formattedOld} → ${formattedNew}`);
        return;
      }

      // Get all unique keys from both objects
      const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

      for (const key of allKeys) {
        const currentPath = path ? `${path}.${key}` : key;

        // Skip internal fields
        if (
          key.startsWith("_") ||
          key === "__v" ||
          key === "updatedAt" ||
          key === "createdAt"
        )
          continue;

        // Check if key exists in both objects
        if (key in obj1 && key in obj2) {
          // If both values are objects, compare them recursively
          if (typeof obj1[key] === "object" && typeof obj2[key] === "object") {
            compareObjects(currentPath, obj1[key], obj2[key]);
          }
          // Compare primitive values
          else if (obj1[key] !== obj2[key]) {
            const formattedOld =
              typeof obj1[key] === "number"
                ? formatCurrency(obj1[key])
                : obj1[key]?.toString() || "null";
            const formattedNew =
              typeof obj2[key] === "number"
                ? formatCurrency(obj2[key])
                : obj2[key]?.toString() || "null";
            const label = getFieldLabel(currentPath);
            summary.push(`${label}: ${formattedOld} → ${formattedNew}`);
          }
        }
        // Handle deleted fields
        else if (key in obj1) {
          const formattedValue =
            typeof obj1[key] === "number"
              ? formatCurrency(obj1[key])
              : obj1[key]?.toString() || "null";
          const label = getFieldLabel(currentPath);
          summary.push(`${label}: ${formattedValue} → [Dihapus]`);
        }
        // Handle added fields
        else if (key in obj2) {
          const formattedValue =
            typeof obj2[key] === "number"
              ? formatCurrency(obj2[key])
              : obj2[key]?.toString() || "null";
          const label = getFieldLabel(currentPath);
          summary.push(`${label}: [Ditambahkan] → ${formattedValue}`);
        }
      }
    };

    // Start comparison from root
    compareObjects("", oldData, newData);

    return summary.length > 0 ? summary : null;
  };

  const showLogDetails = (log: AdminLog) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Activity Logs
          </h1>
          <p className="text-gray-600">
            Track all admin actions and system changes
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange("action", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Actions</option>
                <option value="create_staff">Create Staff</option>
                <option value="update_staff">Update Staff</option>
                <option value="delete_staff">Delete Staff</option>
                <option value="update_plant_prices">Update Plant Prices</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Type
              </label>
              <select
                value={filters.targetType}
                onChange={(e) =>
                  handleFilterChange("targetType", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Types</option>
                <option value="staff">Staff</option>
                <option value="plant">Plant</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date From
              </label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date To
              </label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={clearFilters} variant="outline" size="sm">
              Clear Filters
            </Button>
          </div>
        </motion.div>

        {/* Logs Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Activity Logs ({pagination.total} total)
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">
                No logs found matching your criteria
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {log.adminId?.fullName || log.adminName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.adminId?.userCode || log.adminEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getActionBadgeColor(log.action)}>
                          {getActionText(log.action)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm text-gray-900 capitalize">
                            {log.targetType}
                          </div>
                          {log.targetName && (
                            <div className="text-xs text-gray-500">
                              {log.targetName}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {log.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button
                          onClick={() => showLogDetails(log)}
                          variant="outline"
                          size="sm"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} results
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.max(1, prev.page - 1),
                    }))
                  }
                  disabled={pagination.page === 1}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                <Button
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.pages, prev.page + 1),
                    }))
                  }
                  disabled={pagination.page === pagination.pages}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Details Modal */}
        {showDetailsModal && selectedLog && (
          <div className="fixed inset-0 backdrop-blur-lg bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Log Details
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedLog._id}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Basic Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Admin:</span>{" "}
                        {selectedLog.adminId?.fullName || selectedLog.adminName}
                      </div>
                      <div>
                        <span className="font-medium">Email:</span>{" "}
                        {selectedLog.adminId?.email || selectedLog.adminEmail}
                      </div>
                      <div>
                        <span className="font-medium">User Code:</span>{" "}
                        {selectedLog.adminId?.userCode || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Action:</span>{" "}
                        <Badge
                          className={getActionBadgeColor(selectedLog.action)}
                        >
                          {getActionText(selectedLog.action)}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">Target Type:</span>{" "}
                        <span className="capitalize">
                          {selectedLog.targetType}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Target Name:</span>{" "}
                        {selectedLog.targetName || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span>{" "}
                        {formatDate(selectedLog.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Technical Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">IP Address:</span>{" "}
                        {selectedLog.ipAddress || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">User Agent:</span>{" "}
                        <span className="block">
                          {selectedLog.userAgent || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Description
                  </h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                    {selectedLog.description}
                  </p>
                </div>

                {selectedLog.oldData &&
                  selectedLog.newData &&
                  selectedLog.targetType === "plant" && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                        Ringkasan Perubahan
                      </h4>
                      <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                        {(() => {
                          const changes = getPlantChangeSummary(
                            selectedLog.oldData,
                            selectedLog.newData
                          );
                          if (!changes || changes.length === 0) {
                            return (
                              <p className="text-sm text-gray-600">
                                Tidak ada perubahan harga atau keuntungan yang
                                terdeteksi.
                              </p>
                            );
                          }
                          return (
                            <ul className="space-y-2">
                              {changes.map((change, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium mr-2">
                                    {index + 1}
                                  </span>
                                  <span className="text-sm text-gray-700">
                                    {change}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                {(selectedLog.oldData || selectedLog.newData) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedLog.oldData && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          Old Data
                        </h4>
                        <pre className="text-xs bg-red-50 p-3 rounded-md overflow-x-auto border border-red-200">
                          {JSON.stringify(selectedLog.oldData, null, 2)}
                        </pre>
                      </div>
                    )}

                    {selectedLog.newData && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          New Data
                        </h4>
                        <pre className="text-xs bg-green-50 p-3 rounded-md overflow-x-auto border border-green-200">
                          {JSON.stringify(selectedLog.newData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
