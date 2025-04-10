import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  saleService,
  reportService,
  productService,
  userService,
} from "../api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  CurrencyEuroIcon,
  ShoppingBagIcon,
  CubeIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: "top",
    },
    title: {
      display: true,
      text: "Ventes par jour",
    },
  },
};

export default function Dashboard() {
  // Récupération de toutes les ventes (pour les statistiques)
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: saleService.getAllSales,
  });

  // Filtrer les ventes du jour
  const todaySales = React.useMemo(() => {
    if (!salesData) return [];
    const today = new Date().toISOString().split("T")[0];
    return salesData.filter((sale) => sale.timestamp.split("T")[0] === today);
  }, [salesData]);

  // Modifiez la requête des statistiques de profit
  const { data: profitData } = useQuery({
    queryKey: ["profit"],
    queryFn: async () => {
      const today = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const result = await reportService.getProfitReport(
        lastMonth.toISOString().split("T")[0],
        today.toISOString().split("T")[0]
      );
      console.log("Profit Data:", result); // Ajout du log
      return result;
    },
  });

  // Récupération du nombre de produits
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: productService.getAllProducts,
  });

  // Récupération du nombre d'utilisateurs
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: userService.getAllUsers,
  });

  // Récupération des ventes hebdomadaires pour le graphique
  const { data: weeklyData } = useQuery({
    queryKey: ["weekly-sales"],
    queryFn: async () => {
      const today = new Date();
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      return reportService.getWeeklyReport(
        lastWeek.toISOString().split("T")[0],
        today.toISOString().split("T")[0]
      );
    },
  });

  // Modifiez la fonction formatNumber pour ajouter un log
  const formatNumber = (value) => {
    console.log("Value to format:", value, typeof value);
    if (typeof value !== "number" || isNaN(value)) return "0";
    return new Intl.NumberFormat("fr-FR").format(value);
  };

  // Modifiez la carte des statistiques
  const updatedStats = [
    {
      name: "Chiffre d'affaires",
      value: profitData
        ? `${formatNumber(Number(profitData.totalSales))} GNF`
        : "0 GNF",
      icon: CurrencyEuroIcon,
      change: profitData
        ? `${formatNumber(Number(profitData.profitMargin))}%`
        : "0%",
      changeType:
        (profitData?.profitMargin || 0) >= 0 ? "positive" : "negative",
    },
    {
      name: "Ventes",
      value: profitData?.transactionCount || 0,
      icon: ShoppingBagIcon,
      //change: "+0%", // TODO: Calculer la variation
      changeType: "positive",
    },
    {
      name: "Produits",
      value: products?.length || 0,
      icon: CubeIcon,
      change: `${
        products?.filter((p) => p.quantity <= 10).length || 0
      } en stock bas`,
      changeType: "positive",
    },
    {
      name: "Utilisateurs",
      value: users?.length || 0,
      icon: UserGroupIcon,
      //change: "+0%", // TODO: Calculer la variation
      changeType: "positive",
    },
  ];

  // Mise à jour des données du graphique
  const updatedChartData = {
    labels:
      weeklyData?.map((day) =>
        new Date(day.date).toLocaleDateString("fr-FR", { weekday: "short" })
      ) || [],
    datasets: [
      {
        label: "Ventes",
        data: weeklyData?.map((day) => day.total_sales) || [],
        backgroundColor: "rgba(79, 70, 229, 0.5)",
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Tableau de bord
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {updatedStats.map((item) => (
          <div
            key={item.name}
            className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 sm:py-6"
          >
            <dt>
              <div className="absolute rounded-md bg-indigo-500 p-3">
                <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">
                {item.name}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {item.value}
              </p>
              <p
                className={`ml-2 flex items-baseline text-sm font-semibold ${
                  item.changeType === "positive"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {item.change}
              </p>
            </dd>
          </div>
        ))}
      </div>

      {/* Graphique */}
      <div className="bg-white p-6 rounded-lg shadow">
        <Bar options={chartOptions} data={updatedChartData} />
      </div>

      {/* Dernières ventes */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Ventes du jour
          </h3>
        </div>
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            {salesLoading ? (
              <p>Chargement...</p>
            ) : todaySales.length === 0 ? (
              <p className="text-gray-500">Aucune vente aujourd'hui</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Heure
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paiement
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {todaySales.map((sale) => (
                      <tr key={sale.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sale.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(sale.timestamp).toLocaleTimeString(
                            "fr-FR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Intl.NumberFormat("fr-FR").format(sale.total)}{" "}
                          GNF
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sale.payment_method}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
