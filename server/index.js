import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_jwt_super_securise_changez_moi';

// Middleware
app.use(cors());
app.use(express.json());

// Initialiser la base de données
const db = new Database(join(__dirname, 'database.db'));
db.pragma('journal_mode = WAL');
// Désactiver les foreign keys pour éviter les contraintes
// (on les gère manuellement dans le code)

// ============================================
// CRÉATION DES TABLES MISES À JOUR
// ============================================

// Table utilisateurs avec rôle téléprospecteur
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    nom TEXT,
    prenom TEXT,
    role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'manager', 'user', 'teleprospecteur')),
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Table clients COMPLÈTE avec TOUS les champs
db.exec(`
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
    date_rdv DATETIME,
    type_rdv TEXT CHECK(type_rdv IN ('visio', 'presentiel')),
    statut_rdv TEXT DEFAULT 'en_attente' CHECK(statut_rdv IN ('en_attente', 'planifie', 'confirme', 'en_attente_documents', 'valide', 'annule')),
    notes_rdv TEXT,
    notes TEXT,
    user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Table rendez-vous
db.exec(`
  CREATE TABLE IF NOT EXISTS rendez_vous (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    titre TEXT NOT NULL,
    description TEXT,
    date_heure DATETIME NOT NULL,
    duree INTEGER DEFAULT 60,
    lieu TEXT,
    type TEXT DEFAULT 'reunion' CHECK(type IN ('appel', 'reunion', 'presentation', 'suivi', 'autre')),
    statut TEXT DEFAULT 'planifie' CHECK(statut IN ('en_attente', 'planifie', 'confirme', 'en_attente_documents', 'valide', 'annule')),
    user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Table opportunités
db.exec(`
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Table interactions
db.exec(`
  CREATE TABLE IF NOT EXISTS interactions (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    type TEXT DEFAULT 'note' CHECK(type IN ('email', 'appel', 'reunion', 'note')),
    contenu TEXT NOT NULL,
    date_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Table contacts
db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT,
    telephone TEXT,
    poste TEXT,
    est_principal INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ============================================
// CRÉER UTILISATEUR ADMIN PAR DÉFAUT
// ============================================
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const adminId = crypto.randomUUID();
  const hashedPassword = bcrypt.hashSync('Admin123!', 10);
  db.prepare(`
    INSERT INTO users (id, username, password_hash, email, nom, prenom, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(adminId, 'admin', hashedPassword, 'admin@sevenenergy.com', 'Admin', 'Système', 'admin');
  console.log('✅ Utilisateur admin créé : username=admin, password=Admin123!');
}

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

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
    
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

app.get('/api/users', authenticateToken, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, email, nom, prenom, role, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();
    res.json(users);
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/users', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const { username, password, email, nom, prenom, role } = req.body;
    const id = crypto.randomUUID();
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (id, username, password_hash, email, nom, prenom, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, username, hashedPassword, email, nom, prenom, role || 'user');

    res.json({ success: true, id });
  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.patch('/api/users/:id/toggle', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const { id } = req.params;
    const user = db.prepare('SELECT is_active FROM users WHERE id = ?').get(id);
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const newStatus = user.is_active === 1 ? 0 : 1;
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newStatus, id);

    res.json({ success: true, is_active: newStatus });
  } catch (error) {
    console.error('Erreur toggle utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const { id } = req.params;
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// ROUTES CLIENTS (AVEC TOUS LES NOUVEAUX CHAMPS)
// ============================================

app.get('/api/clients', authenticateToken, (req, res) => {
  try {
    let query = `
      SELECT c.*, u.username as created_by_username
      FROM clients c
      LEFT JOIN users u ON c.user_id = u.id
    `;
    
    // Si l'utilisateur est téléprospecteur, il ne voit que ses propres clients
    if (req.user.role === 'teleprospecteur') {
      query += ` WHERE c.user_id = ?`;
      const clients = db.prepare(query + ` ORDER BY c.created_at DESC`).all(req.user.id);
      return res.json(clients);
    }
    
    // Admin, manager, user voient tout
    const clients = db.prepare(query + ` ORDER BY c.created_at DESC`).all();
    res.json(clients);
  } catch (error) {
    console.error('Erreur récupération clients:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/clients', authenticateToken, (req, res) => {
  try {
    const { 
      nom, prenom, email, telephone, entreprise, poste, 
      adresse, ville, code_postal, pays,
      prenom_contact, nom_contact, telephone_contact, email_contact,
      date_rdv, type_rdv, statut_rdv, notes_rdv, notes
    } = req.body;
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO clients (
        id, nom, prenom, email, telephone, entreprise, poste,
        adresse, ville, code_postal, pays,
        prenom_contact, nom_contact, telephone_contact, email_contact,
        date_rdv, type_rdv, statut_rdv, notes_rdv, notes, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, nom, prenom, email, telephone, entreprise, poste,
      adresse, ville, code_postal, pays || 'France',
      prenom_contact, nom_contact, telephone_contact, email_contact,
      date_rdv, type_rdv, statut_rdv || 'en_attente', notes_rdv, notes, req.user.id
    );

    // Si une date de RDV est fournie ET non vide, créer automatiquement un rendez-vous
    if (date_rdv && typeof date_rdv === 'string' && date_rdv.trim() !== '') {
      const rdvId = crypto.randomUUID();
      const titre = `RDV - ${entreprise || nom}`;
      const description = notes_rdv || '';
      
      db.prepare(`
        INSERT INTO rendez_vous (id, client_id, titre, description, date_heure, statut, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(rdvId, id, titre, description, date_rdv, statut_rdv || 'planifie', req.user.id);
    }

    res.json({ success: true, id });
  } catch (error) {
    console.error('Erreur création client:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/clients/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nom, prenom, email, telephone, entreprise, poste,
      adresse, ville, code_postal, pays,
      prenom_contact, nom_contact, telephone_contact, email_contact,
      date_rdv, type_rdv, statut_rdv, notes_rdv, notes
    } = req.body;

    db.prepare(`
      UPDATE clients 
      SET nom = ?, prenom = ?, email = ?, telephone = ?, entreprise = ?, 
          poste = ?, adresse = ?, ville = ?, 
          code_postal = ?, pays = ?,
          prenom_contact = ?, nom_contact = ?, telephone_contact = ?, email_contact = ?,
          date_rdv = ?, type_rdv = ?, statut_rdv = ?, notes_rdv = ?, notes = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      nom, prenom, email, telephone, entreprise, poste,
      adresse, ville, code_postal, pays,
      prenom_contact, nom_contact, telephone_contact, email_contact,
      date_rdv, type_rdv, statut_rdv, notes_rdv, notes, id
    );

    // Gérer le rendez-vous associé uniquement si date_rdv existe et n'est pas vide
    if (date_rdv && typeof date_rdv === 'string' && date_rdv.trim() !== '') {
      // Vérifier s'il existe déjà un RDV pour ce client
      const existingRdv = db.prepare('SELECT id FROM rendez_vous WHERE client_id = ?').get(id);
      
      if (existingRdv) {
        // Mettre à jour le RDV existant
        db.prepare(`
          UPDATE rendez_vous 
          SET titre = ?, description = ?, date_heure = ?, statut = ?
          WHERE id = ?
        `).run(
          `RDV - ${entreprise || nom}`,
          notes_rdv || '',
          date_rdv,
          statut_rdv || 'planifie',
          existingRdv.id
        );
      } else {
        // Créer un nouveau RDV
        const rdvId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO rendez_vous (id, client_id, titre, description, date_heure, statut, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          rdvId, 
          id, 
          `RDV - ${entreprise || nom}`, 
          notes_rdv || '', 
          date_rdv, 
          statut_rdv || 'planifie', 
          req.user.id
        );
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur mise à jour client:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/clients/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    // Supprimer d'abord tous les RDV associés
    db.prepare('DELETE FROM rendez_vous WHERE client_id = ?').run(id);
    
    // Puis supprimer le client
    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression client:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// ROUTES RENDEZ-VOUS
// ============================================

app.get('/api/rendez-vous', authenticateToken, (req, res) => {
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

    if (filter === 'today') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString();
      query += ` WHERE r.date_heure BETWEEN ? AND ?`;
      params = [startOfDay, endOfDay];
    } else if (filter === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      query += ` WHERE r.date_heure BETWEEN ? AND ?`;
      params = [startOfWeek.toISOString(), endOfWeek.toISOString()];
    } else if (filter === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      query += ` WHERE r.date_heure BETWEEN ? AND ?`;
      params = [startOfMonth, endOfMonth];
    }

    query += ` ORDER BY r.date_heure ASC`;

    const rdvs = params.length > 0 
      ? db.prepare(query).all(...params)
      : db.prepare(query).all();

    // Ajouter un flag is_mine pour chaque RDV
    // Les admins voient TOUT, les autres voient is_mine = true uniquement pour leurs RDV
    const rdvsWithFlag = rdvs.map(rdv => ({
      ...rdv,
      is_mine: req.user.role === 'admin' || req.user.role === 'manager' || rdv.user_id === req.user.id
    }));

    res.json(rdvsWithFlag);
  } catch (error) {
    console.error('Erreur récupération RDV:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/rendez-vous', authenticateToken, (req, res) => {
  try {
    const { client_id, titre, description, date_heure, duree, lieu, type, statut } = req.body;
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO rendez_vous (id, client_id, titre, description, date_heure, duree, lieu, type, statut, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, client_id, titre, description, date_heure, duree || 60, lieu, type || 'reunion', statut || 'planifie', req.user.id);

    res.json({ success: true, id });
  } catch (error) {
    console.error('Erreur création RDV:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/rendez-vous/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { client_id, titre, description, date_heure, duree, lieu, type, statut } = req.body;

    db.prepare(`
      UPDATE rendez_vous 
      SET client_id = ?, titre = ?, description = ?, date_heure = ?, duree = ?, lieu = ?, type = ?, statut = ?
      WHERE id = ?
    `).run(client_id, titre, description, date_heure, duree, lieu, type, statut, id);

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur mise à jour RDV:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/rendez-vous/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM rendez_vous WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression RDV:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// ROUTE STATS DASHBOARD
// ============================================
app.get('/api/stats', authenticateToken, (req, res) => {
  try {
    // Date d'aujourd'hui
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    const stats = {
      total_clients: db.prepare('SELECT COUNT(*) as count FROM clients').get().count,
      total_rdv: db.prepare("SELECT COUNT(*) as count FROM rendez_vous WHERE statut != 'annule'").get().count,
      rdv_aujourdhui: db.prepare("SELECT COUNT(*) as count FROM rendez_vous WHERE date_heure BETWEEN ? AND ? AND statut != 'annule'").get(startOfDay, endOfDay).count,
      rdv_confirmes: db.prepare("SELECT COUNT(*) as count FROM rendez_vous WHERE statut = 'confirme'").get().count
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
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
  console.log(`👤 Admin par défaut: username=admin, password=Admin123!`);
});