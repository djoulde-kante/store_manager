import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { ArrowDownTrayIcon, CalendarIcon } from "@heroicons/react/24/outline";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getTopProducts,
  getProfitReport,
} from "../api/reportService";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const periods = [
  { value: "day", label: "Journalier" },
  { value: "week", label: "Hebdomadaire" },
  { value: "month", label: "Mensuel" },
  { value: "custom", label: "Personnalisé" },
];

// Constante pour la devise
const CURRENCY_CONFIG = {
  style: "currency",
  currency: "GNF",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
};

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState("day");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    },
  ]);
  const today = new Date();
  const queryClient = useQueryClient();

  // Calcul des dates en fonction de la période sélectionnée
  const computedDateRange = useMemo(() => {
    switch (selectedPeriod) {
      case "day":
        return {
          startDate: format(today, "yyyy-MM-dd"),
          endDate: format(today, "yyyy-MM-dd"),
        };
      case "week":
        return {
          startDate: format(
            startOfWeek(today, { weekStartsOn: 1 }),
            "yyyy-MM-dd"
          ),
          endDate: format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        };
      case "month":
        return {
          startDate: format(startOfMonth(today), "yyyy-MM-dd"),
          endDate: format(endOfMonth(today), "yyyy-MM-dd"),
        };
      case "custom":
        return {
          startDate: format(dateRange[0].startDate, "yyyy-MM-dd"),
          endDate: format(dateRange[0].endDate, "yyyy-MM-dd"),
        };
      default:
        return { startDate: "", endDate: "" };
    }
  }, [selectedPeriod, dateRange, today]);

  // Requêtes API
  const { data: salesData, isLoading: isLoadingSales } = useQuery({
    queryKey: ["reports", "sales", selectedPeriod, computedDateRange],
    queryFn: async () => {
      switch (selectedPeriod) {
        case "day":
          return await getDailyReport(computedDateRange.startDate);
        case "week":
        case "custom":
          return await getWeeklyReport(
            computedDateRange.startDate,
            computedDateRange.endDate
          );
        case "month":
          const [year, month] = computedDateRange.startDate.split("-");
          return await getMonthlyReport(year, parseInt(month));
        default:
          return null;
      }
    },
    enabled: Boolean(computedDateRange.startDate && computedDateRange.endDate), // Active la requête uniquement si nous avons des dates valides
  });

  const { data: topProductsData, isLoading: isLoadingTopProducts } = useQuery({
    queryKey: ["reports", "top-products"],
    queryFn: () => getTopProducts(5),
  });

  const { data: profitData, isLoading: isLoadingProfit } = useQuery({
    queryKey: [
      "reports",
      "profit",
      computedDateRange.startDate,
      computedDateRange.endDate,
    ],
    queryFn: async () =>
      getProfitReport(computedDateRange.startDate, computedDateRange.endDate),
  });

  // Préparation des données pour le graphique
  const chartData = useMemo(() => {
    if (!salesData) return null;

    return {
      labels: salesData.map((item) =>
        format(new Date(item.date), "dd MMM", { locale: fr })
      ),
      datasets: [
        {
          label: "Ventes (€)",
          data: salesData.map((item) => item.total_sales),
          backgroundColor: "rgba(79, 70, 229, 0.5)",
          borderColor: "rgba(79, 70, 229, 1)",
          borderWidth: 1,
        },
        {
          label: "Transactions",
          data: salesData.map((item) => item.transaction_count),
          backgroundColor: "rgba(34, 197, 94, 0.5)",
          borderColor: "rgba(34, 197, 94, 1)",
          borderWidth: 1,
        },
      ],
    };
  }, [salesData]);

  const exportToExcel = async () => {
    if (!salesData || !profitData || !topProductsData) return;

    const workbook = new ExcelJS.Workbook();

    // Feuille 1 : Résumé
    const summarySheet = workbook.addWorksheet("Résumé");
    summarySheet.columns = [
      { header: "Métrique", key: "metric", width: 30 },
      { header: "Valeur", key: "value", width: 20 },
    ];

    // Ajout des données de résumé
    summarySheet.addRows([
      {
        metric: "Période",
        value: `Du ${format(
          new Date(computedDateRange.startDate),
          "dd/MM/yyyy"
        )} au ${format(new Date(computedDateRange.endDate), "dd/MM/yyyy")}`,
      },
      {
        metric: "Chiffre d'affaires total",
        value: `${profitData.totalSales.toLocaleString("fr-FR")} GNF`,
      },
      {
        metric: "Bénéfice net",
        value: `${profitData.netProfit.toLocaleString("fr-FR")} GNF`,
      },
      {
        metric: "Marge bénéficiaire",
        value: `${profitData.profitMargin.toFixed(1)}%`,
      },
      {
        metric: "Nombre total de transactions",
        value: profitData.transactionCount,
      },
      {
        metric: "Panier moyen",
        value: `${(
          profitData.totalSales / profitData.transactionCount
        ).toLocaleString("fr-FR")} GNF`,
      },
      {
        metric: "Valeur du stock actuel",
        value: `${profitData.stockValue.toLocaleString("fr-FR")} GNF`,
      },
    ]);

    // Style pour le résumé
    summarySheet.getColumn("metric").font = { bold: true };
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" },
    };

    // Feuille 2 : Ventes détaillées
    const salesSheet = workbook.addWorksheet("Ventes détaillées");
    salesSheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Ventes", key: "total_sales", width: 20 },
      { header: "Nombre de transactions", key: "transaction_count", width: 25 },
      { header: "Panier moyen", key: "average_basket", width: 20 },
    ];

    salesData.forEach((row) => {
      salesSheet.addRow({
        date: format(new Date(row.date), "dd/MM/yyyy"),
        total_sales: `${row.total_sales.toLocaleString("fr-FR")} GNF`,
        transaction_count: row.transaction_count,
        average_basket: `${Math.round(
          row.total_sales / row.transaction_count
        ).toLocaleString("fr-FR")} GNF`,
      });
    });

    // Feuille 3 : Top Produits
    const productsSheet = workbook.addWorksheet("Top Produits");
    productsSheet.columns = [
      { header: "Produit", key: "name", width: 30 },
      { header: "Catégorie", key: "category", width: 20 },
      { header: "Quantité vendue", key: "quantity", width: 20 },
      { header: "Chiffre d'affaires", key: "revenue", width: 25 },
      { header: "% du CA total", key: "percentage", width: 15 },
    ];

    topProductsData.forEach((product) => {
      productsSheet.addRow({
        name: product.name,
        category: product.category,
        quantity: product.total_quantity,
        revenue: `${product.total_sales.toLocaleString("fr-FR")} GNF`,
        percentage: `${(
          (product.total_sales / profitData.totalSales) *
          100
        ).toFixed(1)}%`,
      });
    });

    // Style pour toutes les feuilles
    [salesSheet, productsSheet].forEach((sheet) => {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE5E7EB" },
      };
    });

    // Ajout des totaux
    salesSheet.addRow({
      date: "TOTAL",
      total_sales: `${stats.totalSales.toLocaleString("fr-FR")} GNF`,
      transaction_count: stats.totalTransactions,
      average_basket: `${stats.averageBasket.toLocaleString("fr-FR")} GNF`,
    });

    // Génération du fichier
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `rapport-complet-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    saveAs(new Blob([buffer]), fileName);
  };

  // Calcul des statistiques globales
  const stats = useMemo(() => {
    if (!salesData) return null;

    const totalSales = salesData.reduce(
      (sum, item) => sum + parseInt(item.total_sales),
      0
    );
    const totalTransactions = salesData.reduce(
      (sum, item) => sum + parseInt(item.transaction_count),
      0
    );
    // Arrondissement du panier moyen pour éviter les décimales
    const averageBasket = totalTransactions
      ? Math.round(totalSales / totalTransactions)
      : 0;

    return {
      totalSales,
      totalTransactions,
      averageBasket,
    };
  }, [salesData]);

  // Modifiez également la fermeture du modal pour rafraîchir les données
  const handleDateSelection = () => {
    setShowDatePicker(false);
    // Forcer le rafraîchissement des données
    queryClient.invalidateQueries(["reports", "sales"]);
    queryClient.invalidateQueries(["reports", "profit"]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Rapports</h1>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              if (e.target.value === "custom") {
                setShowDatePicker(true);
              }
            }}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            {periods.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>

          {selectedPeriod === "custom" && (
            <button
              type="button"
              onClick={() => setShowDatePicker(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <CalendarIcon className="-ml-0.5 mr-2 h-4 w-4" />
              {format(dateRange[0].startDate, "dd/MM/yyyy")} -{" "}
              {format(dateRange[0].endDate, "dd/MM/yyyy")}
            </button>
          )}

          <button
            onClick={exportToExcel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" />
            Exporter
          </button>
        </div>
      </div>

      {/* 6. Ajoutez le modal du DateRangePicker */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-xl">
            <DateRange
              ranges={dateRange}
              onChange={(item) => setDateRange([item.selection])}
              maxDate={new Date()}
              locale={fr}
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button
                type="button"
                onClick={handleDateSelection}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique des ventes */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Évolution des ventes
          </h2>
          {isLoadingSales ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : chartData ? (
            <Bar
              data={{
                ...chartData,
                datasets: [
                  {
                    ...chartData.datasets[0],
                    label: "Ventes (GNF)", // Modification du label
                  },
                  chartData.datasets[1],
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: "top",
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) =>
                        value.toLocaleString("fr-FR") + " GNF",
                    },
                  },
                },
              }}
            />
          ) : (
            <p className="text-gray-500 text-center">
              Aucune donnée disponible
            </p>
          )}
        </div>

        {/* Top produits */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Top 5 des produits
          </h2>
          {isLoadingTopProducts ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ventes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topProductsData?.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.total_quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.total_sales.toLocaleString("fr-FR")} GNF
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Chiffre d'affaires total
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats?.totalSales?.toLocaleString("fr-FR", {
                maximumFractionDigits: 0,
                minimumFractionDigits: 0,
              })}{" "}
              GNF
            </dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Nombre de ventes
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats?.totalTransactions?.toLocaleString("fr-FR", {
                maximumFractionDigits: 0,
                minimumFractionDigits: 0,
              })}
            </dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Panier moyen
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats?.averageBasket?.toLocaleString("fr-FR", {
                maximumFractionDigits: 0,
                minimumFractionDigits: 0,
              })}{" "}
              GNF
            </dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Produits vendus
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {topProductsData
                ?.reduce(
                  (sum, product) => sum + parseInt(product.total_quantity),
                  0
                )
                ?.toLocaleString("fr-FR", {
                  maximumFractionDigits: 0,
                  minimumFractionDigits: 0,
                })}
            </dd>
          </div>
        </div>
        {/* Nouvelle card pour le bénéfice net */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Bénéfice net
            </dt>
            {isLoadingProfit ? (
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                <div className="animate-pulse h-8 bg-gray-200 rounded w-24" />
              </dd>
            ) : (
              <>
                <dd
                  className={`mt-1 text-3xl font-semibold ${
                    profitData?.netProfit > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {profitData?.netProfit?.toLocaleString("fr-FR", {
                    maximumFractionDigits: 0,
                    minimumFractionDigits: 0,
                  })}{" "}
                  GNF
                </dd>
                <p className="mt-2 text-sm text-gray-500">
                  Marge: {profitData?.profitMargin?.toFixed(1)}%
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
