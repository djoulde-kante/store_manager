import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  XCircleIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { performanceService } from "../api";
import toast from "react-hot-toast";
import { format, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const periodOptions = [
  { value: "daily", label: "Jour" },
  { value: "weekly", label: "Semaine" },
  { value: "monthly", label: "Mois" },
  { value: "yearly", label: "Année" },
  { value: "all_time", label: "Tout" },
];

export default function UserPerformanceModal({
  isOpen,
  onClose,
  userId,
  userName,
}) {
  const [periodType, setPeriodType] = useState("monthly");
  const queryClient = useQueryClient();

  const { data: performance, isLoading: isLoadingPerformance } = useQuery({
    queryKey: ["userPerformance", userId, periodType],
    queryFn: () => performanceService.getUserPerformance(userId, periodType),
    enabled: isOpen && !!userId,
  });

  const { data: trend, isLoading: isLoadingTrend } = useQuery({
    queryKey: ["userPerformanceTrend", userId, periodType],
    queryFn: () =>
      performanceService.getUserPerformanceTrend(userId, periodType),
    enabled: isOpen && !!userId && periodType !== "all_time",
  });

  // Mutation for manually updating performance data
  const updatePerformanceMutation = useMutation({
    mutationFn: () =>
      performanceService.updateUserPerformance(userId, periodType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPerformance", userId] });
      queryClient.invalidateQueries({
        queryKey: ["userPerformanceTrend", userId],
      });
      toast.success("Données de performance mises à jour avec succès");
    },
    onError: (error) => {
      console.error("Error updating performance:", error);
      toast.error("Erreur lors de la mise à jour des performances");
    },
  });

  // Format currency in GNF
  const formatGNF = (value) => {
    return new Intl.NumberFormat("fr-GN", {
      style: "currency",
      currency: "GNF",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format date ranges for display
  const formatPeriodRange = (start, end) => {
    if (!start || !end) return "Non disponible";
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      return `${format(startDate, "d MMMM yyyy", { locale: fr })} - ${format(
        endDate,
        "d MMMM yyyy",
        { locale: fr }
      )}`;
    } catch (error) {
      return "Format de date invalide";
    }
  };

  // Prepare chart data
  const prepareTrendData = () => {
    if (!trend || trend.length === 0) return null;

    // Sort by period_start for consistent display
    const sortedTrend = [...trend].sort(
      (a, b) => new Date(a.period_start) - new Date(b.period_start)
    );

    const labels = sortedTrend.map((item) => {
      try {
        return format(
          new Date(item.period_start),
          periodType === "daily" ? "dd/MM" : "MMM yyyy",
          { locale: fr }
        );
      } catch {
        return "N/A";
      }
    });

    return {
      labels,
      datasets: [
        {
          label: "Ventes (nombre)",
          data: sortedTrend.map((item) => item.sales_count),
          borderColor: "rgb(53, 162, 235)",
          backgroundColor: "rgba(53, 162, 235, 0.5)",
        },
        {
          label: "Commandes traitées",
          data: sortedTrend.map((item) => item.orders_processed),
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.5)",
        },
      ],
    };
  };

  const prepareSalesData = () => {
    if (!trend || trend.length === 0) return null;

    // Sort by period_start for consistent display
    const sortedTrend = [...trend].sort(
      (a, b) => new Date(a.period_start) - new Date(b.period_start)
    );

    const labels = sortedTrend.map((item) => {
      try {
        return format(
          new Date(item.period_start),
          periodType === "daily" ? "dd/MM" : "MMM yyyy",
          { locale: fr }
        );
      } catch {
        return "N/A";
      }
    });

    return {
      labels,
      datasets: [
        {
          label: "Ventes (GNF)",
          data: sortedTrend.map((item) => item.sales_total),
          backgroundColor: "rgba(255, 99, 132, 0.5)",
        },
      ],
    };
  };

  const handleRefreshData = () => {
    updatePerformanceMutation.mutate();
  };

  const getTrendChange = () => {
    if (!trend || trend.length < 2) return { value: 0, percentage: "0%" };

    const sortedTrend = [...trend].sort(
      (a, b) => new Date(a.period_start) - new Date(b.period_start)
    );

    const currentValue = sortedTrend[sortedTrend.length - 1].sales_total;
    const previousValue = sortedTrend[sortedTrend.length - 2].sales_total;

    if (previousValue === 0) return { value: currentValue, percentage: "N/A" };

    const change = currentValue - previousValue;
    const percentage = (change / previousValue) * 100;

    return {
      value: change,
      percentage: `${percentage > 0 ? "+" : ""}${percentage.toFixed(1)}%`,
      isPositive: change >= 0,
    };
  };

  const trendData = prepareTrendData();
  const salesData = prepareSalesData();
  const trendChange = getTrendChange();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Performance de {userName}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefreshData}
              disabled={updatePerformanceMutation.isPending}
              className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              title="Rafraîchir les données"
            >
              <ArrowDownTrayIcon
                className={`h-5 w-5 ${
                  updatePerformanceMutation.isPending ? "animate-spin" : ""
                }`}
              />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Fermer</span>
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Period selector */}
        <div className="mb-6">
          <label
            htmlFor="periodType"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Période
          </label>
          <div className="flex items-center space-x-2">
            <select
              id="periodType"
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {performance && (
              <span className="text-sm text-gray-500">
                {formatPeriodRange(
                  performance.period_start,
                  performance.period_end
                )}
              </span>
            )}
          </div>
        </div>

        {isLoadingPerformance ? (
          <div className="py-10 flex justify-center">
            <ArrowPathIcon className="h-10 w-10 text-indigo-500 animate-spin" />
          </div>
        ) : !performance ? (
          <p className="text-gray-500 py-10 text-center">
            Aucune donnée disponible
          </p>
        ) : (
          <>
            {/* Performance metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white shadow rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Ventes
                </h3>
                <div className="flex justify-between items-end">
                  <p className="text-2xl font-bold text-gray-900">
                    {performance.sales_count}
                  </p>
                  <p className="text-lg font-semibold text-indigo-600">
                    {formatGNF(performance.sales_total)}
                  </p>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm text-gray-500">
                    Moyenne: {formatGNF(performance.avg_sale_value)} / vente
                  </p>
                  {trendChange.percentage !== "N/A" && (
                    <span
                      className={`text-xs font-medium ${
                        trendChange.isPositive
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {trendChange.percentage}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Produits ajoutés
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {performance.products_added}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {periodType === "daily"
                    ? "Aujourd'hui"
                    : periodType === "weekly"
                    ? "Cette semaine"
                    : periodType === "monthly"
                    ? "Ce mois"
                    : periodType === "yearly"
                    ? "Cette année"
                    : "Total"}
                </p>
              </div>

              <div className="bg-white shadow rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Commandes traitées
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {performance.orders_processed}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Valeur moyenne:{" "}
                  {performance.orders_processed > 0
                    ? formatGNF(
                        performance.sales_total / performance.orders_processed
                      )
                    : formatGNF(0)}
                </p>
              </div>
            </div>

            {/* Performance trends */}
            {periodType !== "all_time" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Évolution des activités
                  </h3>
                  {isLoadingTrend ? (
                    <div className="h-60 flex items-center justify-center">
                      <ArrowPathIcon className="h-8 w-8 text-indigo-500 animate-spin" />
                    </div>
                  ) : !trendData ? (
                    <p className="text-gray-500 text-center py-6">
                      Aucune donnée de tendance disponible
                    </p>
                  ) : (
                    <div className="h-60">
                      <Line
                        data={trendData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                            },
                          },
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Évolution des ventes (GNF)
                  </h3>
                  {isLoadingTrend ? (
                    <div className="h-60 flex items-center justify-center">
                      <ArrowPathIcon className="h-8 w-8 text-indigo-500 animate-spin" />
                    </div>
                  ) : !salesData ? (
                    <p className="text-gray-500 text-center py-6">
                      Aucune donnée de vente disponible
                    </p>
                  ) : (
                    <div className="h-60">
                      <Bar
                        data={salesData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                callback: function (value) {
                                  if (value >= 1000000) {
                                    return (value / 1000000).toFixed(0) + "M";
                                  } else if (value >= 1000) {
                                    return (value / 1000).toFixed(0) + "k";
                                  }
                                  return value;
                                },
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
