# 🚀 CRM Seven Energy - Version Locale + Déploiement Render

**CRM complet avec backend Node.js + Express + SQLite (local) / PostgreSQL (production)**

## 📋 Table des Matières

1. [Installation Locale](#-installation-locale-5-minutes)
2. [Déploiement sur Render](#-déploiement-sur-render)
3. [Fonctionnalités](#-fonctionnalités)
4. [Structure du Projet](#-structure-du-projet)
5. [Configuration](#-configuration)

---

## ⚡ Installation Locale (5 minutes)

### Prérequis

- **Node.js 18+** : [Télécharger Node.js](https://nodejs.org/)
- **npm** (inclus avec Node.js)

### Installation Rapide

```bash
# 1. Extraire le projet
cd crm-seven-energy-local

# 2. Copier les fichiers d'environnement
cp .env.example .env
cp client/.env.example client/.env

# 3. Installer les dépendances RACINE
npm install

# 4. Installer les dépendances CLIENT
cd client
npm install
cd ..

# 5. Lancer l'application (backend + frontend)
npm run dev
```

✅ **C'est tout !** Votre CRM tourne maintenant sur :
- **Frontend** : http://localhost:5173
- **Backend API** : http://localhost:3001/api

### Connexion par Défaut

```
Nom d'utilisateur : admin
Mot de passe : Admin123!
```

---

## 🚀 Déploiement sur Render

### Étape 1 : Préparer le Projet

1. **Créer un compte sur [Render.com](https://render.com)** (gratuit)

2. **Pousser votre code sur GitHub**
   ```bash
   git init
   git add .
   git commit -m "Premier commit CRM Seven Energy"
   git branch -M main
   git remote add origin https://github.com/votre-username/crm-seven-energy.git
   git push -u origin main
   ```

### Étape 2 : Créer une Base PostgreSQL sur Render

1. Dans Render Dashboard, cliquez **New** → **PostgreSQL**
2. Nom : `crm-database`
3. Région : choisissez la plus proche (ex: Frankfurt)
4. Plan : **Free** (ou payant selon besoins)
5. Cliquez **Create Database**
6. **Notez l'URL interne** (commence par `postgresql://...`)

### Étape 3 : Créer le Web Service

1. Dans Render Dashboard, cliquez **New** → **Web Service**
2. Connectez votre repository GitHub
3. Configuration :
   - **Name** : `crm-seven-energy`
   - **Region** : même que la base de données
   - **Branch** : `main`
   - **Build Command** : 
     ```bash
     npm install && cd client && npm install && npm run build && cd ..
     ```
   - **Start Command** : 
     ```bash
     node server/index-postgres.js
     ```
   - **Instance Type** : **Free** (ou payant)

4. **Variables d'environnement** (onglet Environment) :
   ```
   NODE_ENV=production
   PORT=10000
   JWT_SECRET=VOTRE_SECRET_ULTRA_SECURISE_CHANGEZ_MOI
   DATABASE_URL=[Coller l'URL interne PostgreSQL ici]
   ```

5. Cliquez **Create Web Service**

### Étape 4 : Adapter le Code pour PostgreSQL

Vous devez créer un fichier `server/index-postgres.js` qui utilise PostgreSQL au lieu de SQLite.

**Instructions dans le fichier `DEPLOY_RENDER.md`** (inclus dans le projet)

### Étape 5 : Configurer le Frontend

Une fois déployé, Render vous donnera une URL type : `https://crm-seven-energy.onrender.com`

Modifiez `client/.env` :
```env
VITE_API_URL=https://crm-seven-energy.onrender.com/api
```

Puis rebuilder :
```bash
cd client
npm run build
```

Pushez sur GitHub, Render redéploiera automatiquement.

---

## ✨ Fonctionnalités

### 🔐 Authentification
- Système de connexion sécurisé avec JWT
- Gestion des rôles (Admin, Manager, User)
- Sessions persistantes

### 👥 Gestion des Clients
- CRUD complet (Créer, Lire, Modifier, Supprimer)
- Recherche et filtrage
- Statuts : Prospect, Client, Inactif
- Informations détaillées (entreprise, adresse, notes...)

### 📅 Calendrier de Rendez-vous
- Création/modification de RDV
- Types : Appel, Réunion, Présentation, Suivi
- Statuts : Planifié, Confirmé, Terminé, Annulé
- Vue calendrier mensuelle
- Notifications RDV du jour

### 💼 Opportunités Commerciales
- Pipeline des ventes
- Étapes : Prospection, Qualification, Proposition, Négociation
- Montant et probabilité
- Suivi du CA prévisionnel

### 📞 Interactions
- Historique complet par client
- Types : Email, Appel, Réunion, Note
- Horodatage automatique

### 👨‍💼 Gestion Utilisateurs (Admin)
- Créer/activer/désactiver des utilisateurs
- Attribution des rôles
- Sécurité renforcée

### 📊 Tableau de Bord
- KPIs en temps réel
- Statistiques clients/RDV/opportunités
- Alertes RDV en retard

---

## 📁 Structure du Projet

```
crm-seven-energy-local/
├── server/                      # Backend Node.js + Express
│   ├── index.js                # Serveur SQLite (local)
│   ├── index-postgres.js       # Serveur PostgreSQL (Render)
│   └── database.db             # Base SQLite locale
├── client/                      # Frontend React + Vite
│   ├── src/
│   │   ├── components/         # Composants React
│   │   │   ├── Auth.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ClientsManager.tsx
│   │   │   ├── CalendrierRDV.tsx
│   │   │   ├── OpportunitesManager.tsx
│   │   │   ├── InteractionsManager.tsx
│   │   │   ├── ContactsManager.tsx
│   │   │   ├── GestionUtilisateurs.tsx
│   │   │   └── ui/             # Composants shadcn/ui
│   │   ├── lib/
│   │   │   └── api.ts          # Service API
│   │   ├── pages/
│   │   │   └── Index.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   └── images/             # Logo Seven Energy
│   ├── package.json
│   └── vite.config.ts
├── package.json                # Config racine
├── .env.example
└── README.md
```

---

## ⚙️ Configuration

### Variables d'Environnement

#### Backend (`.env`)
```env
PORT=3001
NODE_ENV=development
JWT_SECRET=votre_secret_jwt
DATABASE_URL=./server/database.db  # SQLite local
# DATABASE_URL=postgresql://...    # PostgreSQL production
```

#### Frontend (`client/.env`)
```env
VITE_API_URL=http://localhost:3001/api  # Local
# VITE_API_URL=https://votre-app.onrender.com/api  # Production
```

### Personnalisation

#### Changer le Logo
Remplacez `client/public/images/WhatsApp Image 2025-12-06 at 18.54.20.jpeg` par votre logo.

#### Changer les Couleurs
Modifiez `client/tailwind.config.ts` :
```typescript
colors: {
  primary: {
    DEFAULT: "#0088CC",  // Votre couleur
  }
}
```

#### Ajouter des Champs
Modifiez le schéma de base de données dans `server/index.js` et les composants correspondants.

---

## 🔧 Scripts NPM

### Développement Local
```bash
npm run dev          # Lance backend + frontend
npm run server       # Lance seulement le backend
npm run client       # Lance seulement le frontend
```

### Production
```bash
npm run build        # Build le frontend
npm start            # Lance le serveur en production
```

---

## 🗄️ Base de Données

### SQLite (Développement Local)
- Fichier : `server/database.db`
- Création automatique au premier lancement
- Utilisateur admin créé automatiquement

### PostgreSQL (Production Render)
- Migrer en modifiant `server/index.js` pour utiliser `pg` au lieu de `better-sqlite3`
- Instructions complètes dans `DEPLOY_RENDER.md`

### Schéma des Tables
```sql
users                 -- Utilisateurs du CRM
clients               -- Clients/Prospects
rendez_vous           -- Calendrier RDV
opportunites          -- Pipeline commercial
interactions          -- Historique interactions
contacts              -- Contacts par client
```

---

## 🛡️ Sécurité

### Authentification
- Mots de passe hashés avec bcrypt (10 rounds)
- JWT avec expiration 24h
- Tokens stockés côté client (localStorage)

### Autorisation
- Middleware de vérification JWT sur toutes les routes API
- Rôles : admin, manager, user
- RLS-like (Row Level Security) pour les données utilisateur

### Production
⚠️ **IMPORTANT** :
1. Changez le `JWT_SECRET` en production
2. Utilisez HTTPS (Render le fournit gratuitement)
3. Limitez les requêtes API (rate limiting)
4. Sauvegardez régulièrement la base de données

---

## 📞 Support & Dépannage

### Problème : Port déjà utilisé
```bash
# Changer le port dans .env
PORT=3002
```

### Problème : Base de données corrompue
```bash
# Supprimer et recréer
rm server/database.db
npm run server  # Recrée automatiquement
```

### Problème : Frontend ne se connecte pas au backend
- Vérifiez que `VITE_API_URL` pointe vers la bonne URL
- Vérifiez que le backend tourne (`npm run server`)
- Vérifiez la console navigateur pour les erreurs CORS

---

## 📚 Technologies Utilisées

### Backend
- **Node.js** + **Express.js** - Serveur web
- **better-sqlite3** - Base de données SQLite (local)
- **pg** - PostgreSQL driver (production)
- **bcryptjs** - Hashage mots de passe
- **jsonwebtoken** - Authentification JWT
- **cors** - Cross-Origin Resource Sharing

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Typage statique
- **Vite** - Build tool ultra-rapide
- **Tailwind CSS** - Framework CSS
- **shadcn/ui** - Composants UI
- **Lucide React** - Icônes
- **date-fns** - Manipulation dates

---

## 📄 Licence

Ce projet est fourni tel quel pour **Seven Energy**.

---

## 🎉 Félicitations !

Votre CRM est prêt ! 

**En local** : http://localhost:5173  
**Identifiants** : admin / Admin123!

Pour le déployer sur Render, suivez le guide ci-dessus. 🚀
