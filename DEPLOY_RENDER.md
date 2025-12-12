# 🚀 Guide de Déploiement Render - PostgreSQL

## 📋 Étapes Détaillées pour Déployer sur Render

### 1️⃣ Créer le Fichier PostgreSQL

Créez `server/index-postgres.js` (version adaptée pour PostgreSQL) :

```javascript
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pkg from 'pg';
const { Pool } = pkg;
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET non défini !');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Pool PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connexion
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erreur connexion PostgreSQL:', err);
  } else {
    console.log('✅ PostgreSQL connecté:', res.rows[0].now);
  }
});

// ============================================
// CRÉATION DES TABLES POSTGRESQL
// ============================================

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    // Extension UUID
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Table users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        nom VARCHAR(100),
        prenom VARCHAR(100),
        role VARCHAR(20) DEFAULT 'user' CHECK(role IN ('admin', 'manager', 'user')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table clients
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        telephone VARCHAR(50),
        entreprise VARCHAR(255),
        poste VARCHAR(100),
        adresse TEXT,
        ville VARCHAR(100),
        code_postal VARCHAR(20),
        pays VARCHAR(100) DEFAULT 'France',
        statut VARCHAR(50) DEFAULT 'prospect' CHECK(statut IN ('prospect', 'client', 'inactif')),
        notes TEXT,
        user_id UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table rendez_vous
    await client.query(`
      CREATE TABLE IF NOT EXISTS rendez_vous (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        titre VARCHAR(255) NOT NULL,
        description TEXT,
        date_heure TIMESTAMP NOT NULL,
        duree INTEGER DEFAULT 60,
        lieu VARCHAR(255),
        type VARCHAR(50) DEFAULT 'reunion' CHECK(type IN ('appel', 'reunion', 'presentation', 'suivi', 'autre')),
        statut VARCHAR(50) DEFAULT 'planifie' CHECK(statut IN ('planifie', 'confirme', 'termine', 'annule')),
        user_id UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table opportunites
    await client.query(`
      CREATE TABLE IF NOT EXISTS opportunites (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        titre VARCHAR(255) NOT NULL,
        description TEXT,
        montant DECIMAL(10, 2) DEFAULT 0,
        etape VARCHAR(50) DEFAULT 'prospection' CHECK(etape IN ('prospection', 'qualification', 'proposition', 'negotiation', 'gagne', 'perdu')),
        probabilite INTEGER DEFAULT 50,
        date_cloture_estimee DATE,
        date_cloture_reelle DATE,
        user_id UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table interactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS interactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        type VARCHAR(50) DEFAULT 'note' CHECK(type IN ('email', 'appel', 'reunion', 'note')),
        contenu TEXT NOT NULL,
        date_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table contacts
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        telephone VARCHAR(50),
        poste VARCHAR(100),
        est_principal BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Créer admin si n'existe pas
    const adminCheck = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
    
    if (adminCheck.rows.length === 0) {
      const hashedPassword = bcrypt.hashSync('Admin123!', 10);
      await client.query(`
        INSERT INTO users (username, password_hash, email, nom, prenom, role)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['admin', hashedPassword, 'admin@sevenenergy.com', 'Admin', 'Système', 'admin']);
      console.log('✅ Utilisateur admin créé');
    }

    console.log('✅ Tables PostgreSQL créées');
  } catch (error) {
    console.error('❌ Erreur création tables:', error);
  } finally {
    client.release();
  }
};

// Créer les tables au démarrage
createTables();

// ============================================
// MIDDLEWARE D'AUTHENTIFICATION
// ============================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// ============================================
// ROUTES AUTHENTIFICATION
// ============================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const user = result.rows[0];
    const validPassword = bcrypt.compareSync(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role
    };

    res.json({ success: true, user: userResponse, token });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// ROUTES CLIENTS (exemple - même pattern pour les autres)
// ============================================

app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.username as created_by
      FROM clients c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération clients:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/clients', authenticateToken, async (req, res) => {
  try {
    const { nom, prenom, email, telephone, entreprise, poste, adresse, ville, code_postal, pays, statut, notes } = req.body;
    
    const result = await pool.query(`
      INSERT INTO clients (nom, prenom, email, telephone, entreprise, poste, adresse, ville, code_postal, pays, statut, notes, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [nom, prenom, email, telephone, entreprise, poste, adresse, ville, code_postal, pays || 'France', statut || 'prospect', notes, req.user.id]);

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Erreur création client:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ... AJOUTEZ TOUTES LES AUTRES ROUTES ICI (même logique que index.js mais avec pool.query au lieu de db.prepare)

// ============================================
// SERVIR LE FRONTEND EN PRODUCTION
// ============================================
app.use(express.static(join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../client/dist/index.html'));
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📊 API disponible sur /api`);
});
```

### 2️⃣ Installer pg (PostgreSQL driver)

Ajoutez dans `package.json` :

```json
"dependencies": {
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "better-sqlite3": "^9.2.2",
  "pg": "^8.11.3",  // ← AJOUTEZ CETTE LIGNE
  "dotenv": "^16.3.1"
}
```

### 3️⃣ Configuration Render

Dans le dashboard Render, lors de la création du Web Service :

**Build Command :**
```bash
npm install && cd client && npm install && npm run build && cd ..
```

**Start Command :**
```bash
node server/index-postgres.js
```

**Variables d'environnement :**
```
NODE_ENV=production
PORT=10000
JWT_SECRET=CHANGEZ_MOI_SECRET_ULTRA_SECURISE_123456789
DATABASE_URL=[URL PostgreSQL interne de Render]
```

### 4️⃣ Obtenir l'URL PostgreSQL

1. Dans Render, allez dans votre **PostgreSQL Database**
2. Copiez **Internal Database URL** (commence par `postgresql://...`)
3. Collez dans la variable `DATABASE_URL` du Web Service

### 5️⃣ Configurer le Frontend pour Production

Dans `client/.env` (ou créez-le) :

```env
# Production
VITE_API_URL=https://votre-app-name.onrender.com/api
```

Puis rebuild :
```bash
cd client
npm run build
```

Commitez et poussez sur GitHub, Render redéploiera automatiquement.

---

## 🎯 Checklist Déploiement

- [ ] Compte Render créé
- [ ] Base PostgreSQL créée sur Render
- [ ] URL PostgreSQL copiée
- [ ] Repository GitHub créé et poussé
- [ ] Web Service créé sur Render connecté au repo
- [ ] Variables d'environnement configurées
- [ ] `server/index-postgres.js` créé
- [ ] `pg` ajouté dans `package.json`
- [ ] Build et Start commands configurés
- [ ] Frontend `.env` mis à jour avec URL Render
- [ ] Premier déploiement réussi ✅

---

## 🔍 Debugging sur Render

### Voir les logs
- Dashboard Render → Votre service → Onglet **Logs**

### Erreurs courantes

**Erreur : Cannot find module 'pg'**
- Solution : Ajoutez `"pg": "^8.11.3"` dans `package.json`

**Erreur : JWT_SECRET non défini**
- Solution : Vérifiez les variables d'environnement dans Render

**Erreur : ECONNREFUSED PostgreSQL**
- Solution : Vérifiez que `DATABASE_URL` est correctement défini

**Erreur : Cannot GET /api/...**
- Solution : Vérifiez que le serveur démarre correctement dans les logs

---

## 🎉 Résultat Final

Votre CRM sera accessible à :

**https://votre-app-name.onrender.com**

Avec :
- ✅ Backend Node.js + Express + PostgreSQL
- ✅ Frontend React optimisé
- ✅ HTTPS automatique
- ✅ Redéploiement automatique à chaque push GitHub

---

## 💰 Coûts

- **Free Tier Render** : 
  - Web Service gratuit (750h/mois)
  - PostgreSQL gratuit (90 jours puis $7/mois)
  - Le service s'endort après 15 min d'inactivité (réveil ~30s)

- **Paid Tier** ($7-25/mois) :
  - Service toujours actif
  - Plus de ressources
  - Backups automatiques

---

Bon déploiement ! 🚀
