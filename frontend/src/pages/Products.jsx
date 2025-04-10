import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { productService } from "../api";
import { useAuth } from "../context/AuthContext";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

const categories = ["Alimentaire", "Boissons", "Hygiène", "Entretien", "Autre"];

export default function Products() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  // Récupération des produits depuis l'API
  const { data: products, isLoading } = useQuery({
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

  // Mutation pour créer ou mettre à jour un produit
  const mutation = useMutation({
    mutationFn: async (data) => {
      // Convertir les prix et la quantité en nombres
      const productData = {
        ...data,
        buy_price: parseFloat(data.buy_price),
        sell_price: parseFloat(data.sell_price),
        quantity: parseInt(data.quantity),
      };

      if (selectedProduct) {
        // Mise à jour d'un produit existant
        return await productService.updateProduct(
          selectedProduct.id,
          productData
        );
      } else {
        // Création d'un nouveau produit
        return await productService.createProduct(productData);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsModalOpen(false);
      reset();
      // Ajouter la notification de succès
      toast.success(
        selectedProduct
          ? "Produit modifié avec succès"
          : "Produit ajouté avec succès"
      );
    },
    onError: (error) => {
      console.error("Erreur lors de l'opération sur le produit:", error);
      // Ajouter la notification d'erreur
      toast.error(
        "Une erreur est survenue: " + (error.message || "Erreur inconnue")
      );
    },
  });

  // Mutation pour supprimer un produit
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await productService.deleteProduct(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit supprimé avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de la suppression du produit:", error);
      toast.error(
        "Impossible de supprimer le produit: " +
          (error.message || "Erreur inconnue")
      );
    },
  });

  const onSubmit = (data) => {
    mutation.mutate(data);
  };

  const handleEdit = (product) => {
    // Adapter les noms de champs pour correspondre au formulaire
    const formData = {
      ...product,
      name: product.name,
      category: product.category,
      buy_price: product.buy_price,
      sell_price: product.sell_price,
      quantity: product.quantity,
      barcode: product.barcode,
      description: product.description || "",
    };
    setSelectedProduct(product);
    reset(formData);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
      deleteMutation.mutate(id);
    }
  };

  // Filtrer les produits en fonction du terme de recherche et de la catégorie sélectionnée
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products.filter((product) => {
      const searchQuery = searchTerm.toLowerCase();
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery) ||
        product.barcode.toLowerCase().includes(searchQuery);

      const matchesCategory =
        selectedCategory === "all" || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Calculer la valeur totale du stock
  const totalStockValue = useMemo(() => {
    if (!products) return 0;
    return products.reduce((total, product) => {
      return total + product.buy_price * product.quantity;
    }, 0);
  }, [products]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Produits</h1>
        {isAdmin && (
          <button
            onClick={() => {
              setSelectedProduct(null);
              reset({
                name: "",
                category: "",
                buy_price: "",
                sell_price: "",
                quantity: "",
                barcode: "",
                description: "",
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Ajouter un produit
          </button>
        )}
      </div>

      {/* Ajout de la valeur du stock et barre de recherche */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1 max-w-lg flex items-center gap-4">
          {/* Barre de recherche existante */}
          <div className="flex-1 relative rounded-md shadow-sm">
            <input
              type="text"
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full px-6 py-3 sm:text-sm border-gray-300 rounded-md"
              placeholder="Rechercher par nom ou code-barres..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Nouveau sélecteur de catégorie */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Valeur du stock actuel */}
        <div className="bg-white shadow rounded-lg px-6 py-4 w-fit">
          <dt className="text-sm font-medium text-gray-500">
            Valeur du stock actuel
          </dt>
          <dd className="mt-1 text-2xl font-semibold text-gray-900">
            {isLoading ? (
              <div className="animate-pulse h-8 bg-gray-200 rounded w-32"></div>
            ) : (
              `${totalStockValue.toLocaleString("fr-FR")} GNF`
            )}
          </dd>
        </div>
      </div>

      {/* Tableau des produits */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <p className="text-gray-500">Aucun produit trouvé</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Catégorie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix d'achat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix de vente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code-barres
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.buy_price.toLocaleString()} GNF
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.sell_price.toLocaleString()} GNF
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          {product.quantity}
                          {product.quantity < 10 && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Stock faible
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.barcode}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      )}
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
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {selectedProduct ? "Modifier le produit" : "Ajouter un produit"}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nom
                </label>
                <input
                  {...register("name", { required: "Le nom est requis" })}
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Catégorie
                </label>
                <select
                  {...register("category", {
                    required: "La catégorie est requise",
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.category.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Prix d'achat
                  </label>
                  <input
                    {...register("buy_price", {
                      required: "Le prix d'achat est requis",
                      min: { value: 0, message: "Le prix doit être positif" },
                    })}
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  {errors.buy_price && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.buy_price.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Prix de vente
                  </label>
                  <input
                    {...register("sell_price", {
                      required: "Le prix de vente est requis",
                      min: { value: 0, message: "Le prix doit être positif" },
                    })}
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  {errors.sell_price && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.sell_price.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantité
                </label>
                <input
                  {...register("quantity", {
                    required: "La quantité est requise",
                    min: {
                      value: 0,
                      message: "La quantité doit être positive",
                    },
                  })}
                  type="number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                {errors.quantity && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.quantity.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Code-barres
                </label>
                <input
                  {...register("barcode", {
                    required: "Le code-barres est requis",
                  })}
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                {errors.barcode && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.barcode.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  {...register("description")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  rows="3"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                >
                  {mutation.isPending
                    ? "En cours..."
                    : selectedProduct
                    ? "Modifier"
                    : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
