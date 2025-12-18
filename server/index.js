import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_jwt_super_securise_changez_moi';

// Configuration PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Forcer le timezone Europe/Paris pour corriger le décalage horaire
pool.on('connect', async (client) => {
  await client.query("SET timezone = 'Europe/Paris'");
});

// Test de connexion
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erreur connexion PostgreSQL:', err.stack);
  } else {
    console.log('✅ Connexion PostgreSQL réussie');
    release();
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// CRÉATION DES TABLES
// ============================================

const initDatabase = async () => {
  try {
    // Table utilisateurs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT,
        nom TEXT,
        prenom TEXT,
        role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'manager', 'user', 'teleprospecteur')),
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table clients
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        prenom TEXT,
        email TEXT,
        telephone TEXT,
        entreprise TEXT,
        poste TEXT,
        adresse TEXT,
        ville TEXT,
        code_postal TEXT,
        pays TEXT DEFAULT 'France',
        prenom_contact TEXT,
        nom_contact TEXT,
        telephone_contact TEXT,
        email_contact TEXT,
        date_rdv TIMESTAMP,
        type_rdv TEXT CHECK(type_rdv IN ('visio', 'presentiel')),
        statut_rdv TEXT DEFAULT 'en_attente' CHECK(statut_rdv IN ('en_attente', 'planifie', 'confirme', 'en_attente_documents', 'valide', 'annule')),
        notes_rdv TEXT,
        notes TEXT,
        user_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table rendez-vous
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rendez_vous (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        titre TEXT NOT NULL,
        description TEXT,
        date_heure TIMESTAMP NOT NULL,
        duree INTEGER DEFAULT 60,
        lieu TEXT,
        type TEXT DEFAULT 'reunion' CHECK(type IN ('appel', 'reunion', 'presentation', 'suivi', 'autre')),
        statut TEXT DEFAULT 'planifie' CHECK(statut IN ('en_attente', 'planifie', 'confirme', 'en_attente_documents', 'valide', 'annule')),
        user_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table opportunités
    await pool.query(`
      CREATE TABLE IF NOT EXISTS opportunites (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        titre TEXT NOT NULL,
        description TEXT,
        montant REAL DEFAULT 0,
        etape TEXT DEFAULT 'prospection' CHECK(etape IN ('prospection', 'qualification', 'proposition', 'negotiation', 'gagne', 'perdu')),
        probabilite INTEGER DEFAULT 50,
        date_cloture_estimee DATE,
        date_cloture_reelle DATE,
        user_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table interactions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interactions (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        type TEXT DEFAULT 'note' CHECK(type IN ('email', 'appel', 'reunion', 'note')),
        contenu TEXT NOT NULL,
        date_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table contacts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        email TEXT,
        telephone TEXT,
        poste TEXT,
        est_principal INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tables créées avec succès');

    // Créer admin par défaut
    const adminCheck = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const adminId = crypto.randomUUID();
      const hashedPassword = bcrypt.hashSync('Admin123!', 10);
      await pool.query(
        'INSERT INTO users (id, username, password_hash, email, nom, prenom, role) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [adminId, 'admin', hashedPassword, 'admin@sevenenergy.com', 'Admin', 'Système', 'admin']
      );
      console.log('✅ Utilisateur admin créé : username=admin, password=Admin123!');
    }
  } catch (error) {
    console.error('❌ Erreur initialisation base de données:', error);
  }
};

initDatabase();

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

    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND is_active = 1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

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

    res.json({
      success: true,
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ============================================
// ROUTES UTILISATEURS
// ============================================

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, email, nom, prenom, role, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const { username, password, email, nom, prenom, role } = req.body;
    const id = crypto.randomUUID();
    const hashedPassword = bcrypt.hashSync(password, 10);

    await pool.query(
      'INSERT INTO users (id, username, password_hash, email, nom, prenom, role) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, username, hashedPassword, email, nom, prenom, role || 'user']
    );

    res.json({ success: true, id });
  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.patch('/api/users/:id/toggle', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const { id } = req.params;
    const result = await pool.query('SELECT is_active FROM users WHERE id = $1', [id]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const newStatus = user.is_active === 1 ? 0 : 1;
    await pool.query('UPDATE users SET is_active = $1 WHERE id = $2', [newStatus, id]);

    res.json({ success: true, is_active: newStatus });
  } catch (error) {
    console.error('Erreur toggle utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// ROUTES CLIENTS
// ============================================

app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT c.*, u.username as created_by_username
      FROM clients c
      LEFT JOIN users u ON c.user_id = u.id
    `;

    let result;
    if (req.user.role === 'teleprospecteur') {
      query += ` WHERE c.user_id = $1 ORDER BY c.created_at DESC`;
      result = await pool.query(query, [req.user.id]);
    } else {
      query += ` ORDER BY c.created_at DESC`;
      result = await pool.query(query);
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération clients:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/clients', authenticateToken, async (req, res) => {
  try {
    const {
      nom, prenom, email, telephone, entreprise, poste,
      adresse, ville, code_postal, pays,
      prenom_contact, nom_contact, telephone_contact, email_contact,
      date_rdv, type_rdv, statut_rdv, notes_rdv, notes
    } = req.body;
    const id = crypto.randomUUID();

    await pool.query(`
      INSERT INTO clients (
        id, nom, prenom, email, telephone, entreprise, poste,
        adresse, ville, code_postal, pays,
        prenom_contact, nom_contact, telephone_contact, email_contact,
        date_rdv, type_rdv, statut_rdv, notes_rdv, notes, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    `, [
      id, nom, prenom, email, telephone, entreprise, poste,
      adresse, ville, code_postal, pays || 'France',
      prenom_contact, nom_contact, telephone_contact, email_contact,
      date_rdv, type_rdv, statut_rdv || 'en_attente', notes_rdv, notes, req.user.id
    ]);

    if (date_rdv && typeof date_rdv === 'string' && date_rdv.trim() !== '') {
      const rdvId = crypto.randomUUID();
      const titre = `RDV - ${entreprise || nom}`;
      const description = notes_rdv || '';

      await pool.query(`
        INSERT INTO rendez_vous (id, client_id, titre, description, date_heure, statut, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [rdvId, id, titre, description, date_rdv, statut_rdv || 'planifie', req.user.id]);
    }

    res.json({ success: true, id });
  } catch (error) {
    console.error('Erreur création client:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nom, prenom, email, telephone, entreprise, poste,
      adresse, ville, code_postal, pays,
      prenom_contact, nom_contact, telephone_contact, email_contact,
      date_rdv, type_rdv, statut_rdv, notes_rdv, notes
    } = req.body;

    await pool.query(`
      UPDATE clients
      SET nom = $1, prenom = $2, email = $3, telephone = $4, entreprise = $5,
          poste = $6, adresse = $7, ville = $8,
          code_postal = $9, pays = $10,
          prenom_contact = $11, nom_contact = $12, telephone_contact = $13, email_contact = $14,
          date_rdv = $15, type_rdv = $16, statut_rdv = $17, notes_rdv = $18, notes = $19,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $20
    `, [
      nom, prenom, email, telephone, entreprise, poste,
      adresse, ville, code_postal, pays,
      prenom_contact, nom_contact, telephone_contact, email_contact,
      date_rdv, type_rdv, statut_rdv, notes_rdv, notes, id
    ]);

    if (date_rdv && typeof date_rdv === 'string' && date_rdv.trim() !== '') {
      const existingRdv = await pool.query('SELECT id FROM rendez_vous WHERE client_id = $1', [id]);

      if (existingRdv.rows.length > 0) {
        await pool.query(`
          UPDATE rendez_vous
          SET titre = $1, description = $2, date_heure = $3, statut = $4
          WHERE id = $5
        `, [`RDV - ${entreprise || nom}`, notes_rdv || '', date_rdv, statut_rdv || 'planifie', existingRdv.rows[0].id]);
      } else {
        const rdvId = crypto.randomUUID();
        await pool.query(`
          INSERT INTO rendez_vous (id, client_id, titre, description, date_heure, statut, user_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [rdvId, id, `RDV - ${entreprise || nom}`, notes_rdv || '', date_rdv, statut_rdv || 'planifie', req.user.id]);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur mise à jour client:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM rendez_vous WHERE client_id = $1', [id]);
    await pool.query('DELETE FROM clients WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression client:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// ROUTES RENDEZ-VOUS
// ============================================

app.get('/api/rendez-vous', authenticateToken, async (req, res) => {
  try {
    const { filter } = req.query;

    let query = `
      SELECT r.*, c.nom as client_nom, c.prenom as client_prenom,
             c.entreprise, c.email, c.telephone, c.ville, c.code_postal,
             u.username as created_by_username
      FROM rendez_vous r
      LEFT JOIN clients c ON r.client_id = c.id
      LEFT JOIN users u ON r.user_id = u.id
    `;

    const now = new Date();
    let params = [];
    let paramIndex = 1;

    if (filter === 'today') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString();
      query += ` WHERE r.date_heure BETWEEN $${paramIndex++} AND $${paramIndex++}`;
      params = [startOfDay, endOfDay];
    } else if (filter === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      query += ` WHERE r.date_heure BETWEEN $${paramIndex++} AND $${paramIndex++}`;
      params = [startOfWeek.toISOString(), endOfWeek.toISOString()];
    } else if (filter === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      query += ` WHERE r.date_heure BETWEEN $${paramIndex++} AND $${paramIndex++}`;
      params = [startOfMonth, endOfMonth];
    }

    query += ` ORDER BY r.date_heure ASC`;

    const result = await pool.query(query, params);
    const rdvsWithFlag = result.rows.map(rdv => ({
      ...rdv,
      is_mine: req.user.role === 'admin' || req.user.role === 'manager' || rdv.user_id === req.user.id
    }));

    res.json(rdvsWithFlag);
  } catch (error) {
    console.error('Erreur récupération RDV:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/rendez-vous', authenticateToken, async (req, res) => {
  try {
    const { client_id, titre, description, date_heure, duree, lieu, type, statut } = req.body;
    const id = crypto.randomUUID();

    await pool.query(`
      INSERT INTO rendez_vous (id, client_id, titre, description, date_heure, duree, lieu, type, statut, user_id)      
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [id, client_id, titre, description, date_heure, duree || 60, lieu, type || 'reunion', statut || 'planifie', req.user.id]);

    res.json({ success: true, id });
  } catch (error) {
    console.error('Erreur création RDV:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/rendez-vous/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { client_id, titre, description, date_heure, duree, lieu, type, statut } = req.body;

    await pool.query(`
      UPDATE rendez_vous
      SET client_id = $1, titre = $2, description = $3, date_heure = $4, duree = $5, lieu = $6, type = $7, statut = $8
      WHERE id = $9
    `, [client_id, titre, description, date_heure, duree, lieu, type, statut, id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur mise à jour RDV:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/rendez-vous/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM rendez_vous WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression RDV:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// ROUTE STATS DASHBOARD
// ============================================
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    const totalClients = await pool.query('SELECT COUNT(*) as count FROM clients');
    const totalRdv = await pool.query("SELECT COUNT(*) as count FROM rendez_vous WHERE statut != 'annule'");
    const rdvAujourdhui = await pool.query("SELECT COUNT(*) as count FROM rendez_vous WHERE date_heure BETWEEN $1 AND $2 AND statut != 'annule'", [startOfDay, endOfDay]);
    const rdvConfirmes = await pool.query("SELECT COUNT(*) as count FROM rendez_vous WHERE statut = 'confirme'");

    const stats = {
      total_clients: parseInt(totalClients.rows[0].count),
      total_rdv: parseInt(totalRdv.rows[0].count),
      rdv_aujourdhui: parseInt(rdvAujourdhui.rows[0].count),
      rdv_confirmes: parseInt(rdvConfirmes.rows[0].count)
    };

    res.json(stats);
  } catch (error) {
    console.error('Erreur récupération stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// SERVIR LE FRONTEND EN PRODUCTION
// ============================================
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../client/dist/index.html'));
  });
}

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
  console.log(`👤 Admin par défaut: username=admin, password=Admin123!`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Base de données: PostgreSQL`);
});