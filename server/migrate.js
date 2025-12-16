import Database from 'better-sqlite3';
import pkg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connexion SQLite (ancienne DB)
const sqlite = new Database(join(__dirname, 'database.db'));

// Connexion PostgreSQL (nouvelle DB)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('🔄 Début de la migration...');

    // Migrer les utilisateurs
    const users = sqlite.prepare('SELECT * FROM users').all();
    console.log(`📊 ${users.length} utilisateurs trouvés`); // ← Correction ici (parenthèses au lieu de backticks)
    
    for (const user of users) {
      if (user.username === 'admin') {
        console.log('⏭️  Admin déjà existant, skip...');
        continue;
      }
      await pool.query(`
        INSERT INTO users (id, username, password_hash, email, nom, prenom, role, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, [user.id, user.username, user.password_hash, user.email, user.nom, user.prenom, user.role, user.is_active, user.created_at]);
    }
    console.log('✅ Utilisateurs migrés');

    // Migrer les clients
    const clients = sqlite.prepare('SELECT * FROM clients').all();
    console.log(`📊 ${clients.length} clients trouvés`); // ← Correction ici
    
    for (const client of clients) {
      await pool.query(`
        INSERT INTO clients (
          id, nom, prenom, email, telephone, entreprise, poste,
          adresse, ville, code_postal, pays,
          prenom_contact, nom_contact, telephone_contact, email_contact,
          date_rdv, type_rdv, statut_rdv, notes_rdv, notes, user_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        ON CONFLICT (id) DO NOTHING
      `, [
        client.id, client.nom, client.prenom, client.email, client.telephone, 
        client.entreprise, client.poste, client.adresse, client.ville, 
        client.code_postal, client.pays, client.prenom_contact, client.nom_contact,
        client.telephone_contact, client.email_contact, client.date_rdv, 
        client.type_rdv, client.statut_rdv, client.notes_rdv, client.notes,
        client.user_id, client.created_at, client.updated_at
      ]);
    }
    console.log('✅ Clients migrés');

    // Migrer les rendez-vous
    const rdvs = sqlite.prepare('SELECT * FROM rendez_vous').all();
    console.log(`📊 ${rdvs.length} rendez-vous trouvés`); // ← Correction ici
    
    for (const rdv of rdvs) {
      await pool.query(`
        INSERT INTO rendez_vous (
          id, client_id, titre, description, date_heure, duree, lieu, type, statut, user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [
        rdv.id, rdv.client_id, rdv.titre, rdv.description, rdv.date_heure,
        rdv.duree, rdv.lieu, rdv.type, rdv.statut, rdv.user_id, rdv.created_at
      ]);
    }
    console.log('✅ Rendez-vous migrés');

    console.log('🎉 Migration terminée avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur migration:', error);
    process.exit(1);
  }
}

migrate();