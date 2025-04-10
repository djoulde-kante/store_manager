import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { orderService, productService } from "../api";
import { useAuth } from "../context/AuthContext";
import toast from 'react-hot-toast';

const orderStatus = [
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmée" },
  { value: "shipped", label: "Reçue" },
  { value: "cancelled", label: "Annulée" },
];

export default function Orders() {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [orderItems, setOrderItems] = useState([{ product_id: "", quantity: 1 }]);
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const { isAdmin } = useAuth();

  // Récupération des commandes depuis l'API
  const { data: orders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      try {
        const data = await orderService.getAllOrders();
        return data;
      } catch (error) {
        console.error("Erreur lors de la récupération des commandes:", error);
        return [];
      }
    },
  });

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

  // Récupération des détails d'une commande spécifique
  const { data: orderDetails, refetch: refetchOrderDetails } = useQuery({
    queryKey: ["orderDetails", selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder) return null;
      try {
        const data = await orderService.getOrderById(selectedOrder.id);
        return data;
      } catch (error) {
        console.error("Erreur lors de la récupération des détails de la commande:", error);
        return null;
      }
    },
    enabled: !!selectedOrder,
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (selectedOrder) {
        // Mise à jour du statut d'une commande existante
        return await orderService.updateOrderStatus(selectedOrder.id, data.status);
      } else {
        // Préparation des données de commande pour création
        const orderData = {
          items: data.items.map((item) => ({
            product_id: parseInt(item.product_id),
            quantity: parseInt(item.quantity),
            price: parseFloat(
              products.find((p) => p.id === parseInt(item.product_id)).sell_price
            ),
          })),
          total: data.items.reduce((sum, item) => {
            const product = products.find(
              (p) => p.id === parseInt(item.product_id)
            );
            return sum + (product ? product.sell_price * parseInt(item.quantity) : 0);
          }, 0),
        };
        // Création d'une nouvelle commande
        return await orderService.createOrder(orderData);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (selectedOrder) {
        // Si on a modifié une commande existante, on invalide aussi ses détails
        queryClient.invalidateQueries({ queryKey: ["orderDetails", selectedOrder.id] });
      }
      setIsModalOpen(false);
      reset();
      toast.success(selectedOrder ? "Statut de la commande mis à jour avec succès" : "Commande créée avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de l'opération:", error);
      toast.error("Une erreur est survenue: " + (error.message || "Erreur inconnue"));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await orderService.deleteOrder(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Commande supprimée avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Impossible de supprimer la commande: " + (error.message || "Erreur inconnue"));
    }
  });

  // Fonctions pour gérer les articles de la commande
  const addOrderItem = () => {
    setOrderItems([...orderItems, { product_id: "", quantity: 1 }]);
  };

  const removeOrderItem = (index) => {
    const newItems = [...orderItems];
    newItems.splice(index, 1);
    setOrderItems(newItems);
  };

  const updateOrderItem = (index, field, value) => {
    const newItems = [...orderItems];
    newItems[index][field] = value;
    setOrderItems(newItems);
  };

  const onSubmit = (data) => {
    if (selectedOrder) {
      // Pour la modification, on n'envoie que le statut
      if (!data.status) {
        alert("Veuillez sélectionner un statut valide");
        return;
      }
      mutation.mutate(data);
    } else {
      // Pour la création, on envoie les articles
      if (orderItems.length === 0 || orderItems.some(item => !item.product_id || item.quantity < 1)) {
        alert("Veuillez ajouter au moins un produit avec une quantité valide");
        return;
      }
      mutation.mutate({ ...data, items: orderItems });
    }
  };

  const handleEdit = (order) => {
    setSelectedOrder(order);
    reset({ status: order.status });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette commande ?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    refetchOrderDetails();
    setIsDetailModalOpen(true);
  };

  // Réinitialisation des articles de commande lors de l'ouverture du formulaire
  const resetOrderForm = () => {
    setSelectedOrder(null);
    reset();
    setOrderItems([{ product_id: "", quantity: 1 }]);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          Commandes de réapprovisionnement
        </h1>
        <button
          onClick={resetOrderForm}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Nouvelle commande
        </button>
      </div>

      {/* Tableau des commandes */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {isLoadingOrders ? (
            <p>Chargement...</p>
          ) : orders?.length === 0 ? (
            <p className="text-gray-500">Aucune commande</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
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
                  {orders?.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            order.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : order.status === "confirmed"
                              ? "bg-blue-100 text-blue-800"
                              : order.status === "shipped"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {
                            orderStatus.find((s) => s.value === order.status)
                              ?.label
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.total.toLocaleString()} GNF
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(order)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        {order.status === "pending" && isAdmin && (
                          <>
                            <button
                              onClick={() => handleEdit(order)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(order.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'ajout/modification */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              {selectedOrder ? "Modifier le statut de la commande" : "Nouvelle commande de réapprovisionnement"}
            </h2>
            {!selectedOrder && (
              <p className="text-sm text-gray-500 mb-4">
                Ajoutez des produits à commander auprès de vos fournisseurs pour réapprovisionner votre stock.
              </p>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {selectedOrder ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Statut
                  </label>
                  <select
                    {...register("status", { required: "Le statut est requis" })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Sélectionner un statut</option>
                    {orderStatus.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  {errors.status && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.status.message}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Articles de la commande
                  </h3>
                  <div className="flex items-center space-x-4 text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    <div className="flex-grow">Produit</div>
                    <div className="w-24 text-center">Quantité</div>
                    <div className="w-32 text-right">Total</div>
                    <div className="w-10"></div>
                  </div>
                  {orderItems.map((item, index) => (
                    <div key={index} className="flex items-center space-x-4 mt-2">
                      <div className="flex-grow">
                        <select
                          value={item.product_id}
                          onChange={(e) => updateOrderItem(index, "product_id", e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="">Sélectionner un produit</option>
                          {products?.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - {product.sell_price.toLocaleString()} GNF
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(index, "quantity", e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                      <div className="w-32 text-right">
                        {item.product_id ? (
                          <span className="text-sm font-medium">
                            {(products.find(p => p.id === parseInt(item.product_id))?.sell_price * item.quantity).toLocaleString()} GNF
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOrderItem(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addOrderItem}
                    className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    Ajouter un article
                  </button>

                  {/* Récapitulatif du total */}
                  <div className="mt-4 border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium">Total de la commande</span>
                      <span className="text-lg font-bold text-indigo-600">
                        {orderItems.reduce((total, item) => {
                          const product = products?.find(p => p.id === parseInt(item.product_id));
                          return total + (product ? product.sell_price * item.quantity : 0);
                        }, 0).toLocaleString()} GNF
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {selectedOrder ? "Modifier" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de détails */}
      {isDetailModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Détails de la commande de réapprovisionnement #{selectedOrder.id}
            </h2>
            {!orderDetails ? (
              <div className="flex justify-center items-center h-40">
                <p className="text-gray-500">Chargement des détails...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">
                    Informations générales
                  </h3>
                  <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Date</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(orderDetails.created_at).toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Statut
                      </dt>
                      <dd className="mt-1">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            orderDetails.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : orderDetails.status === "confirmed"
                              ? "bg-blue-100 text-blue-800"
                              : orderDetails.status === "shipped"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {
                            orderStatus.find(
                              (s) => s.value === orderDetails.status
                            )?.label
                          }
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Total</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {orderDetails.total.toLocaleString()} GNF
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Client</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {orderDetails.user_name || "Utilisateur inconnu"}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700">
                    Produits commandés
                  </h3>
                  <div className="mt-2">
                    {orderDetails.items && orderDetails.items.length > 0 ? (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Produit
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Quantité
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Prix unitaire
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {orderDetails.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.product_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.quantity}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.price_at_order.toLocaleString()} GNF
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {(item.price_at_order * item.quantity).toLocaleString()} GNF
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-gray-500">Aucun produit dans cette commande</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
