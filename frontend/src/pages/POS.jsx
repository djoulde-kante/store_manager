import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { PlusIcon, TrashIcon, PrinterIcon } from "@heroicons/react/24/outline";
import jsPDF from "jspdf";
import { productService, saleService } from "../api";
import toast from "react-hot-toast";

const paymentMethods = ["Espèces", "Carte bancaire", "Mobile"];
const paymentMethodMapping = {
  Espèces: "cash",
  "Carte bancaire": "card",
  Mobile: "mobile",
};

export default function POS() {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cashReceived, setCashReceived] = useState("");
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

  // Modifier la mutation et la gestion du ticket
  const mutation = useMutation({
    mutationFn: async (data) => {
      // Préparation des données de vente pour l'API
      const promises = data.items.map((item) => {
        const saleData = {
          product_id: item.id,
          quantity: item.quantity,
          total: item.sell_price * item.quantity,
          payment_method: paymentMethodMapping[data.payment_method],
        };
        return saleService.createSale(saleData);
      });

      const results = await Promise.all(promises);
      return {
        saleResults: results,
        saleData: data,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      // Générer le ticket avec l'ID de la première vente
      generateReceipt({
        ...data.saleData,
        id: data.saleResults[0].id,
        payment_method: paymentMethodMapping[data.saleData.payment_method],
      });
      setCart([]);
      reset();
      setCashReceived("");
      // Ajouter la notification de succès
      toast.success("Vente enregistrée avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de l'enregistrement de la vente:", error);
      // Ajouter la notification d'erreur
      toast.error(
        "Erreur lors de l'enregistrement de la vente: " +
          (error.message || "Erreur inconnue")
      );
    },
  });

  const filteredProducts = products?.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.toString().includes(searchTerm)
  );

  const total = cart.reduce(
    (sum, item) => sum + item.sell_price * item.quantity,
    0
  );

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
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 30);
    doc.text(`N°: ${sale.id || "Temporaire"}`, 20, 40);
    doc.text("----------------------------------------", 20, 50);
    let y = 60;
    sale.items.forEach((item) => {
      doc.text(
        `${item.name} x${item.quantity} - ${(
          item.sell_price * item.quantity
        ).toFixed(2)} GNF`,
        20,
        y
      );
      y += 10;
    });
    doc.text("----------------------------------------", 20, y);
    doc.text(`Total: ${sale.total.toFixed(2)} GNF`, 20, y + 10);
    doc.text(`Paiement: ${sale.payment_method}`, 20, y + 20);

    if (sale.payment_method === "cash" && sale.cashReceived) {
      doc.text(
        `Montant reçu: ${parseFloat(sale.cashReceived).toFixed(2)} GNF`,
        20,
        y + 30
      );
      doc.text(
        `Rendu: ${(parseFloat(sale.cashReceived) - sale.total).toFixed(2)} GNF`,
        20,
        y + 40
      );
    }

    doc.save(`ticket-${new Date().getTime()}.pdf`);
  };

  const onSubmit = (data) => {
    if (cart.length === 0) return;

    const saleData = {
      ...data,
      items: cart,
      total,
      cashReceived: data.payment_method === "Espèces" ? cashReceived : null,
    };

    mutation.mutate(saleData);
    // Suppression de l'appel direct à generateReceipt ici
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Point de vente</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recherche de produits */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher un produit
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 px-6 py-3 focus:ring-indigo-500 sm:text-sm"
              placeholder="Nom ou code-barres"
            />
          </div>

          {searchTerm && (
            <div className="mb-6 max-h-60 overflow-y-auto border rounded-md">
              {filteredProducts?.length === 0 ? (
                <p className="p-4 text-gray-500">Aucun produit trouvé</p>
              ) : (
                filteredProducts?.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleAddToCart(product)}
                    className="w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 flex justify-between items-center"
                  >
                    <div>
                      <span className="block font-medium">{product.name}</span>
                      <span className="block text-sm text-gray-500">
                        {product.category}
                      </span>
                    </div>
                    <span className="font-medium text-indigo-600">
                      {product.sell_price.toLocaleString()} GNF
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Panier et paiement */}
        <div className="lg:col-span-1 bg-white shadow rounded-lg p-6 flex flex-col h-full">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Panier</h2>

          <div className="flex-grow overflow-y-auto mb-4">
            {cart.length === 0 ? (
              <p className="text-gray-500">Aucun produit dans le panier</p>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex-grow">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        {item.sell_price.toLocaleString()} GNF x {item.quantity}{" "}
                        = {(item.sell_price * item.quantity).toFixed(2)} GNF
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
              <span className="text-lg font-bold text-indigo-600">
                {total.toLocaleString()} GNF
              </span>
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
                  <option value="">Sélectionner</option>
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

              {/* Champ pour le montant reçu (espèces uniquement) */}
              {register("payment_method")?.value === "Espèces" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Montant reçu
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={total}
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />

                  {cashReceived && parseFloat(cashReceived) >= total && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Monnaie à rendre:</span>{" "}
                      <span className="text-green-600 font-bold">
                        {(parseFloat(cashReceived) - total).toFixed(2)} GNF
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={cart.length === 0}
                className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <span className="mr-2">Valider la vente</span>
                <PrinterIcon className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
