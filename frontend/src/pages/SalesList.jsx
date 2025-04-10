import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PrinterIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import jsPDF from "jspdf";
import { saleService } from "../api";

export default function SalesList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Récupération des ventes depuis l'API
  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      try {
        const data = await saleService.getAllSales();
        return data;
      } catch (error) {
        console.error("Erreur lors de la récupération des ventes:", error);
        return [];
      }
    },
  });

  const generateReceipt = (sale) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Ticket de caisse", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Date: ${new Date(sale.timestamp).toLocaleString()}`, 20, 30);
    doc.text(`N°: ${sale.id}`, 20, 40);
    doc.text("----------------------------------------", 20, 50);
    let y = 60;

    // Pour une vente individuelle
    doc.text(
      `${sale.product_name} x${
        sale.quantity
      } - ${sale.total.toLocaleString()} GNF`,
      20,
      y
    );
    y += 10;

    doc.text("----------------------------------------", 20, y);
    doc.text(`Total: ${sale.total.toLocaleString()} GNF`, 20, y + 10);
    doc.text(`Paiement: ${sale.payment_method}`, 20, y + 20);
    doc.save(`ticket-${sale.id}.pdf`);
  };

  // Filtrer les ventes en fonction des critères de recherche
  const filteredSales = sales?.filter((sale) => {
    const matchesSearch =
      !searchTerm ||
      sale.id?.toString().includes(searchTerm) ||
      sale.payment_method?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate =
      !dateFilter ||
      new Date(sale.timestamp).toISOString().substring(0, 10) === dateFilter;

    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Historique des ventes
        </h1>
      </div>

      {/* Filtres */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700"
            >
              Recherche
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 px-6 py-3 sm:text-sm border-gray-300 rounded-md"
                placeholder="N° de vente ou mode de paiement"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700"
            >
              Date
            </label>
            <input
              type="date"
              id="date"
              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm px-6 py-3 border-gray-300 rounded-md"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setDateFilter("");
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des ventes */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          {isLoading ? (
            <p>Chargement...</p>
          ) : filteredSales?.length === 0 ? (
            <p className="text-gray-500">Aucune vente trouvée</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      N° de vente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mode de paiement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre d'articles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSales?.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {sale.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(sale.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.payment_method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {sale.total.toLocaleString()} GNF
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => generateReceipt(sale)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <PrinterIcon className="h-4 w-4 mr-1" />
                          Ticket
                        </button>
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
  );
}
