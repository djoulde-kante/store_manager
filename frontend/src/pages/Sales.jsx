import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { PlusIcon, TrashIcon, PrinterIcon } from "@heroicons/react/24/outline";
import jsPDF from "jspdf";
import { productService, saleService } from "../api";

const paymentMethods = ["Espèces", "Carte bancaire", "Mobile"];
const paymentMethodMapping = {
  "Espèces": "cash",
  "Carte bancaire": "card",
  "Mobile": "mobile"
};

export default function Sales() {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  // Récupération des produits depuis l'API
  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      try {
        const data = await productService.getAllProducts();
        return data;
      } catch (error) {
        console.error("Erreur lors de la récupération des produits:", error);
        return [];
      }
    },
  });

  // Récupération des ventes depuis l'API
  const { data: sales, isLoading: isLoadingSales } = useQuery({
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

  const mutation = useMutation({
    mutationFn: async (data) => {
      // Préparation des données de vente pour l'API
      // Créer une vente pour chaque produit dans le panier
      const promises = data.items.map((item) => {
        const saleData = {
          product_id: item.id,
          quantity: item.quantity,
          total: item.sell_price * item.quantity,
          payment_method: paymentMethodMapping[data.payment_method],
        };
        return saleService.createSale(saleData);
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      setCart([]);
      reset();
    },
  });

  const filteredProducts = products?.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.toString().includes(searchTerm)
  );

  const total = cart.reduce((sum, item) => sum + item.sell_price * item.quantity, 0);

  const handleAddToCart = (product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
    setSearchTerm("");
  };

  const handleRemoveFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const handleUpdateQuantity = (productId, quantity) => {
    if (quantity < 1) return;
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const generateReceipt = (sale) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Ticket de caisse", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Date: ${new Date(sale.timestamp).toLocaleString()}`, 20, 30);
    doc.text(`N°: ${sale.id}`, 20, 40);
    doc.text("----------------------------------------", 20, 50);
    let y = 60;
    sale.items.forEach((item) => {
      doc.text(
        `${item.name} x${item.quantity} - ${(item.price * item.quantity).toLocaleString()} GNF`,
        20,
        y
      );
      y += 10;
    });
    doc.text("----------------------------------------", 20, y);
    doc.text(`Total: ${sale.total.toLocaleString()} GNF`, 20, y + 10);
    doc.text(`Paiement: ${sale.payment_method}`, 20, y + 20);
    doc.save(`ticket-${sale.id}.pdf`);
  };

  const onSubmit = (data) => {
    if (cart.length === 0) return;
    mutation.mutate({
      ...data,
      items: cart,
      total,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Ventes</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulaire de vente */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Nouvelle vente
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Rechercher un produit
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Nom ou code-barres"
              />
              {searchTerm && (
                <div className="mt-2 max-h-60 overflow-y-auto">
                  {filteredProducts?.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleAddToCart(product)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50"
                    >
                      {product.name} - {product.sell_price.toLocaleString()} GNF
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Panier</h3>
              {cart.length === 0 ? (
                <p className="text-gray-500">Aucun produit dans le panier</p>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">
                          {item.sell_price.toLocaleString()} GNF x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateQuantity(
                              item.id,
                              parseInt(e.target.value)
                            )
                          }
                          className="w-16 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-medium">Total</span>
                <span className="text-lg font-medium">{total.toLocaleString()} GNF</span>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mode de paiement
                  </label>
                  <select
                    {...register("payment_method", {
                      required: "Le mode de paiement est requis",
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Sélectionner un mode de paiement</option>
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                  {errors.payment_method && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.payment_method.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={cart.length === 0}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Valider la vente
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Historique des ventes */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Historique des ventes
            </h2>
            {isLoadingSales ? (
              <p>Chargement...</p>
            ) : sales?.length === 0 ? (
              <p className="text-gray-500">Aucune vente</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paiement
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sales?.map((sale) => (
                      <tr key={sale.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(sale.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sale.total.toLocaleString()} GNF
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sale.payment_method}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => generateReceipt(sale)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <PrinterIcon className="h-5 w-5" />
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
    </div>
  );
}
