import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { userService } from "../api";
import toast from "react-hot-toast";
import { format, formatDistance } from "date-fns";
import { fr } from "date-fns/locale";
import UserPerformanceModal from "../components/UserPerformanceModal";

const roles = [
  { value: "admin", label: "Administrateur" },
  { value: "employee", label: "Employé" },
];

const statusOptions = [
  { value: "active", label: "Actif", color: "bg-green-100 text-green-800" },
  { value: "inactive", label: "Inactif", color: "bg-red-100 text-red-800" },
];

export default function Users() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        return await userService.getAllUsers();
      } catch (error) {
        toast.error("Erreur lors du chargement des utilisateurs");
        return [];
      }
    },
  });

  const { data: activityLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["userActivity", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      try {
        return await userService.getUserActivityLogs(selectedUserId);
      } catch (error) {
        toast.error("Erreur lors du chargement des logs d'activité");
        return [];
      }
    },
    enabled: !!selectedUserId && isActivityModalOpen,
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (selectedUser) {
        return await userService.updateUser(selectedUser.id, data);
      } else {
        return await userService.createUser(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsModalOpen(false);
      reset();
      toast.success(
        selectedUser
          ? "Utilisateur modifié avec succès"
          : "Utilisateur créé avec succès"
      );
    },
    onError: (error) => {
      console.error("Erreur lors de l'opération sur l'utilisateur:", error);
      toast.error(
        "Une erreur est survenue: " +
          (error.response?.data?.msg || error.message || "Erreur inconnue")
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await userService.deleteUser(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Utilisateur supprimé avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors de la suppression:", error);
      toast.error(
        "Impossible de supprimer l'utilisateur: " +
          (error.response?.data?.msg || error.message || "Erreur inconnue")
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return await userService.changeUserStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Statut de l'utilisateur modifié avec succès");
    },
    onError: (error) => {
      console.error("Erreur lors du changement de statut:", error);
      toast.error(
        "Impossible de modifier le statut: " +
          (error.response?.data?.msg || error.message || "Erreur inconnue")
      );
    },
  });

  const onSubmit = (data) => {
    // Validation supplémentaire
    if (!selectedUser && !data.password) {
      toast.error("Le mot de passe est requis pour un nouvel utilisateur");
      return;
    }

    mutation.mutate({
      username: data.username,
      password: data.password, // Le backend ignorera le mot de passe si vide lors d'une mise à jour
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      status: data.status,
    });
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    reset(user);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (
      window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")
    ) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatusChange = (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const action = newStatus === "active" ? "activer" : "désactiver";

    if (
      window.confirm(`Êtes-vous sûr de vouloir ${action} cet utilisateur ?`)
    ) {
      statusMutation.mutate({ id, status: newStatus });
    }
  };

  const handleViewActivity = (userId) => {
    setSelectedUserId(userId);
    setIsActivityModalOpen(true);
  };

  const handleViewPerformance = (userId, userName) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setIsPerformanceModalOpen(true);
  };

  // Filter users based on search term and filters
  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      searchTerm === "" ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.first_name &&
        user.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.last_name &&
        user.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email &&
        user.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = filterRole === "" || user.role === filterRole;
    const matchesStatus = filterStatus === "" || user.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const formatDateTime = (dateString) => {
    if (!dateString) return "Jamais";
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy HH:mm:ss");
    } catch (error) {
      return dateString;
    }
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return "Jamais";
    try {
      const date = new Date(dateString);
      return formatDistance(date, new Date(), { addSuffix: true, locale: fr });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Utilisateurs</h1>
        <button
          onClick={() => {
            setSelectedUser(null);
            reset();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Ajouter un utilisateur
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-5">
              <label htmlFor="search" className="sr-only">
                Rechercher
              </label>
              <input
                type="text"
                id="search"
                placeholder="Rechercher par nom, email..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="sm:col-span-3">
              <select
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="">Tous les rôles</option>
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <select
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Tous les statuts</option>
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-1">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterRole("");
                  setFilterStatus("");
                }}
                className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                title="Réinitialiser les filtres"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des utilisateurs */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {isLoading ? (
            <p>Chargement...</p>
          ) : filteredUsers?.length === 0 ? (
            <p className="text-gray-500">Aucun utilisateur trouvé</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom d'utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dernière connexion
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers?.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.first_name && user.last_name ? (
                          `${user.first_name} ${user.last_name}`
                        ) : (
                          <span className="text-gray-400">Non renseigné</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email || (
                          <span className="text-gray-400">Non renseigné</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === "admin"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {roles.find((r) => r.value === user.role)?.label ||
                            user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            statusOptions.find((s) => s.value === user.status)
                              ?.color || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {statusOptions.find((s) => s.value === user.status)
                            ?.label || user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_login ? (
                          <span title={formatDateTime(user.last_login)}>
                            {getRelativeTime(user.last_login)}
                          </span>
                        ) : (
                          "Jamais"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Modifier"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleViewActivity(user.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Voir l'activité"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() =>
                              handleViewPerformance(user.id, user.username)
                            }
                            className="text-green-600 hover:text-green-900"
                            title="Voir les performances"
                          >
                            <ChartBarIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(user.id, user.status)
                            }
                            className={
                              user.status === "active"
                                ? "text-red-600 hover:text-red-900"
                                : "text-green-600 hover:text-green-900"
                            }
                            title={
                              user.status === "active"
                                ? "Désactiver"
                                : "Activer"
                            }
                          >
                            {user.status === "active" ? (
                              <XCircleIcon className="h-5 w-5" />
                            ) : (
                              <CheckCircleIcon className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Supprimer"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
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
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {selectedUser
                ? "Modifier l'utilisateur"
                : "Ajouter un utilisateur"}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nom d'utilisateur *
                  </label>
                  <input
                    {...register("username", {
                      required: "Le nom d'utilisateur est requis",
                    })}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.username.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mot de passe {!selectedUser && "*"}
                  </label>
                  <input
                    {...register("password", {
                      required: !selectedUser && "Le mot de passe est requis",
                      minLength: {
                        value: 6,
                        message:
                          "Le mot de passe doit contenir au moins 6 caractères",
                      },
                    })}
                    type="password"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Prénom
                  </label>
                  <input
                    {...register("first_name")}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nom
                  </label>
                  <input
                    {...register("last_name")}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    {...register("email", {
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Format d'email invalide",
                      },
                    })}
                    type="email"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Téléphone
                  </label>
                  <input
                    {...register("phone")}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Rôle *
                  </label>
                  <select
                    {...register("role", { required: "Le rôle est requis" })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Sélectionner un rôle</option>
                    {roles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  {errors.role && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.role.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Statut
                  </label>
                  <select
                    {...register("status")}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {mutation.isPending ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      En cours...
                    </>
                  ) : selectedUser ? (
                    "Modifier"
                  ) : (
                    "Ajouter"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal d'activité */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Journal d'activité
              </h2>
              <button
                onClick={() => setIsActivityModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Fermer</span>
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            {isLoadingLogs ? (
              <div className="py-10 flex justify-center">
                <ClockIcon className="h-10 w-10 text-indigo-500 animate-pulse" />
              </div>
            ) : activityLogs?.length === 0 ? (
              <p className="text-gray-500 py-10 text-center">
                Aucune activité enregistrée
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type d'action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Détails
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Adresse IP
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activityLogs?.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              log.action_type.includes("LOGIN")
                                ? "bg-blue-100 text-blue-800"
                                : log.action_type.includes("FAILED")
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {log.action_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {log.action_details}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.ip_address || "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de performance */}
      <UserPerformanceModal
        isOpen={isPerformanceModalOpen}
        onClose={() => setIsPerformanceModalOpen(false)}
        userId={selectedUserId}
        userName={selectedUserName}
      />
    </div>
  );
}
