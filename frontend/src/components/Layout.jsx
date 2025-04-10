import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  HomeIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  ChartBarIcon,
  CubeIcon,
  Bars3Icon,
  XMarkIcon,
  CurrencyDollarIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

const dashboardNavigation = [
  { name: "Vue d'ensemble", href: "/dashboard", icon: HomeIcon },
  { name: "Produits", href: "/dashboard/products", icon: CubeIcon },
  { name: "Ventes", href: "/dashboard/sales", icon: ShoppingBagIcon },
  { name: "Commandes", href: "/dashboard/orders", icon: ShoppingCartIcon },
  { name: "Rapports", href: "/dashboard/reports", icon: ChartBarIcon },
  {
    name: "Utilisateurs",
    href: "/dashboard/users",
    icon: UserGroupIcon,
    adminOnly: true,
  },
];

const mainNavigation = [
  { name: "Point de vente", href: "/pos", icon: CurrencyDollarIcon },
  { name: "Tableau de bord", href: "/dashboard", icon: HomeIcon },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  // Détermine si nous sommes dans le tableau de bord ou le point de vente
  const isDashboard = location.pathname.startsWith("/dashboard");

  // Filtre les éléments de navigation en fonction des droits de l'utilisateur
  const filteredNavigation = dashboardNavigation.filter(
    (item) => !item.adminOnly || (item.adminOnly && isAdmin)
  );

  // Affiche la navigation secondaire uniquement dans le tableau de bord
  const currentNavigation = isDashboard ? filteredNavigation : [];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md bg-white shadow-md"
        >
          <Bars3Icon className="h-6 w-6 text-gray-600" />
        </button>
      </div>

      {/* Sidebar for mobile */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-200 ease-in-out`}
      >
        <div className="relative flex flex-col w-64 h-full bg-white shadow-lg">
          <div className="flex items-center justify-between p-4 border-b">
            <h1 className="text-xl font-bold text-gray-800">Store Manager</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <XMarkIcon className="h-6 w-6 text-gray-600" />
            </button>
          </div>

          {/* User info */}
          {user && (
            <div className="px-4 py-3 border-b">
              <div className="text-sm font-medium text-gray-900">
                {user.username}
              </div>
              <div className="text-xs text-gray-500">
                {user.role === "admin" ? "Administrateur" : "Employé"}
              </div>
            </div>
          )}

          {/* Navigation principale */}
          <nav className="mt-5 px-2 border-b pb-5">
            {mainNavigation.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href === "/dashboard" &&
                  location.pathname.startsWith("/dashboard"));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-3 text-base font-medium rounded-md ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={`mr-3 h-6 w-6 ${
                      isActive
                        ? "text-indigo-500"
                        : "text-gray-400 group-hover:text-gray-500"
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Navigation secondaire (uniquement si dans le tableau de bord) */}
          {isDashboard && currentNavigation.length > 0 && (
            <nav className="mt-5 px-2">
              <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tableau de bord
              </h3>
              <div className="mt-2 space-y-1">
                {currentNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        isActive
                          ? "bg-gray-100 text-gray-900"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon
                        className={`mr-3 h-5 w-5 ${
                          isActive
                            ? "text-gray-500"
                            : "text-gray-400 group-hover:text-gray-500"
                        }`}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </nav>
          )}

          {/* Logout button */}
          <div className="mt-auto px-2 py-4 border-t">
            <button
              onClick={() => {
                setSidebarOpen(false);
                logout();
              }}
              className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-red-600 hover:bg-red-50 w-full"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-6 w-6 text-red-500" />
              Déconnexion
            </button>
          </div>
        </div>
        {/* Backdrop for closing sidebar on mobile */}
        <div
          className="absolute inset-0 bg-gray-600 bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        ></div>
      </div>

      {/* Sidebar for desktop - always visible */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="w-64 flex flex-col">
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
            <div className="flex items-center h-16 flex-shrink-0 px-4 border-b">
              <h1 className="text-xl font-bold text-gray-800">Store Manager</h1>
            </div>

            {/* User info */}
            {user && (
              <div className="px-4 py-3 border-b">
                <div className="text-sm font-medium text-gray-900">
                  {user.username}
                </div>
                <div className="text-xs text-gray-500">
                  {user.role === "admin" ? "Administrateur" : "Employé"}
                </div>
              </div>
            )}

            {/* Navigation principale */}
            <div className="flex-1 flex flex-col overflow-y-auto">
              <nav className="flex-1 px-2 py-4 border-b">
                {mainNavigation.map((item) => {
                  const isActive =
                    location.pathname === item.href ||
                    (item.href === "/dashboard" &&
                      location.pathname.startsWith("/dashboard"));
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center px-2 py-3 text-base font-medium rounded-md mb-1 ${
                        isActive
                          ? "bg-indigo-50 text-indigo-600"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <item.icon
                        className={`mr-3 h-6 w-6 ${
                          isActive
                            ? "text-indigo-500"
                            : "text-gray-400 group-hover:text-gray-500"
                        }`}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              {/* Navigation secondaire (uniquement si dans le tableau de bord) */}
              {isDashboard && currentNavigation.length > 0 && (
                <nav className="flex-1 px-2 py-4">
                  <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tableau de bord
                  </h3>
                  <div className="mt-2 space-y-1">
                    {currentNavigation.map((item) => {
                      const isActive = location.pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                            isActive
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          <item.icon
                            className={`mr-3 h-5 w-5 ${
                              isActive
                                ? "text-gray-500"
                                : "text-gray-400 group-hover:text-gray-500"
                            }`}
                          />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </nav>
              )}

              {/* Logout button */}
              <div className="px-2 py-4 border-t mt-auto">
                <button
                  onClick={logout}
                  className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-red-600 hover:bg-red-50 w-full"
                >
                  <ArrowRightOnRectangleIcon className="mr-3 h-6 w-6 text-red-500" />
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
