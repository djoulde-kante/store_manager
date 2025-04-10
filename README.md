# Store Manager - Application de Gestion de Supérette

Application web complète pour la gestion d'une supérette, permettant de gérer les stocks, les ventes, les commandes, les utilisateurs et les rapports.

## Fonctionnalités

- **Gestion des stocks** : Ajout, modification, suppression et consultation des produits avec alertes de stock bas
- **Point de vente (POS)** : Interface de caisse avec scan de code-barres et calcul de monnaie
- **Gestion des commandes** : Suivi des commandes avec différents statuts (en attente, confirmée, expédiée, annulée)
- **Gestion des utilisateurs** : Authentification et autorisations basées sur les rôles (admin/employé)
- **Rapports et analyses** : Tableaux de bord avec graphiques pour suivre les ventes et les performances

## Technologies utilisées

### Frontend
- React.js
- Tailwind CSS
- Chart.js (pour les graphiques)
- jsPDF (pour l'export de tickets et rapports)

### Backend
- Node.js
- Express.js
- JWT (pour l'authentification)
- MySQL (base de données)

## Installation et configuration

### Prérequis
- Node.js (v14 ou supérieur)
- MySQL (v5.7 ou supérieur)

### Base de données
1. Créez une base de données MySQL
2. Importez le schéma de base de données depuis `backend/database.sql`

```bash
mysql -u votre_utilisateur -p votre_base_de_donnees < backend/database.sql
```

### Backend
1. Accédez au répertoire backend
```bash
cd backend
```

2. Installez les dépendances
```bash
npm install
```

3. Créez un fichier `.env` avec les informations suivantes
```
PORT=5000
DB_HOST=localhost
DB_USER=votre_utilisateur_mysql
DB_PASSWORD=votre_mot_de_passe_mysql
DB_NAME=store_manager
JWT_SECRET=votre_clé_secrète_jwt
```

4. Démarrez le serveur
```bash
npm start
```

### Frontend
1. Accédez au répertoire frontend
```bash
cd frontend
```

2. Installez les dépendances
```bash
npm install
```

3. Démarrez l'application React
```bash
npm run dev
```

## Utilisation

### Accès à l'application
Accédez à l'application via l'URL : http://localhost:5173

### Identifiants par défaut
- **Utilisateur** : admin
- **Mot de passe** : admin123

## Structure du projet

```
store-manager/
├── frontend/               # Application React
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── pages/          # Pages de l'application
│   │   └── assets/         # Ressources statiques
│   └── ...
├── backend/                # API Node.js
│   ├── config/             # Configuration
│   ├── middleware/         # Middleware Express
│   ├── models/             # Modèles de données
│   ├── routes/             # Routes API
│   ├── database.sql        # Schéma de base de données
│   └── server.js           # Point d'entrée du serveur
└── README.md               # Documentation

## Licence
Ce projet est sous licence MIT.
