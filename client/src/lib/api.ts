// Service API pour communiquer avec le backend local
const API_URL = import.meta.env.MODE === 'production' 
  ? '/api'  // URL relative en production (même serveur)
  : 'http://localhost:3001/api';  // Localhost en développement
// Stockage du token
let authToken: string | null = localStorage.getItem('crm_token');

// Fonction helper pour les requêtes
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erreur réseau' }));
    throw new Error(error.error || 'Erreur lors de la requête');
  }

  return response.json();
}

// ======================
// AUTHENTIFICATION
// ======================

export const auth = {
  async login(username: string, password: string) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (data.token) {
      authToken = data.token;
      localStorage.setItem('crm_token', data.token);
      localStorage.setItem('crm_user', JSON.stringify(data.user));
    }

    return data;
  },

  async verify() {
    return apiRequest('/auth/verify');
  },

  logout() {
    authToken = null;
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('crm_user');
    return userStr ? JSON.parse(userStr) : null;
  }
};

// ======================
// UTILISATEURS
// ======================

export const users = {
  async getAll() {
    return apiRequest('/users');
  },

  async create(userData: any) {
    return apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async toggle(id: string) {
    return apiRequest(`/users/${id}/toggle`, {
      method: 'PATCH',
    });
  },

  async delete(id: string) {
    return apiRequest(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};

// ======================
// CLIENTS
// ======================

export const clients = {
  async getAll() {
    return apiRequest('/clients');
  },

  async create(clientData: any) {
    return apiRequest('/clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
  },

  async update(id: string, clientData: any) {
    return apiRequest(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clientData),
    });
  },

  async delete(id: string) {
    return apiRequest(`/clients/${id}`, {
      method: 'DELETE',
    });
  },
};

// ======================
// RENDEZ-VOUS
// ======================

export const rendezVous = {
  async getAll() {
    return apiRequest('/rendez-vous');
  },

  async create(rdvData: any) {
    return apiRequest('/rendez-vous', {
      method: 'POST',
      body: JSON.stringify(rdvData),
    });
  },

  async update(id: string, rdvData: any) {
    return apiRequest(`/rendez-vous/${id}`, {
      method: 'PUT',
      body: JSON.stringify(rdvData),
    });
  },

  async delete(id: string) {
    return apiRequest(`/rendez-vous/${id}`, {
      method: 'DELETE',
    });
  },
};

// ======================
// OPPORTUNITÉS
// ======================

export const opportunites = {
  async getAll() {
    return apiRequest('/opportunites');
  },

  async create(oppData: any) {
    return apiRequest('/opportunites', {
      method: 'POST',
      body: JSON.stringify(oppData),
    });
  },

  async update(id: string, oppData: any) {
    return apiRequest(`/opportunites/${id}`, {
      method: 'PUT',
      body: JSON.stringify(oppData),
    });
  },

  async delete(id: string) {
    return apiRequest(`/opportunites/${id}`, {
      method: 'DELETE',
    });
  },
};

// ======================
// INTERACTIONS
// ======================

export const interactions = {
  async getAll(clientId?: string) {
    const query = clientId ? `?client_id=${clientId}` : '';
    return apiRequest(`/interactions${query}`);
  },

  async create(interactionData: any) {
    return apiRequest('/interactions', {
      method: 'POST',
      body: JSON.stringify(interactionData),
    });
  },

  async delete(id: string) {
    return apiRequest(`/interactions/${id}`, {
      method: 'DELETE',
    });
  },
};

// ======================
// CONTACTS
// ======================

export const contacts = {
  async getAll(clientId?: string) {
    const query = clientId ? `?client_id=${clientId}` : '';
    return apiRequest(`/contacts${query}`);
  },

  async create(contactData: any) {
    return apiRequest('/contacts', {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
  },

  async update(id: string, contactData: any) {
    return apiRequest(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(contactData),
    });
  },

  async delete(id: string) {
    return apiRequest(`/contacts/${id}`, {
      method: 'DELETE',
    });
  },
};

// ======================
// STATISTIQUES
// ======================

export const stats = {
  async getAll() {
    return apiRequest('/stats');
  },
};

// Exporter tout
export default {
  auth,
  users,
  clients,
  rendezVous,
  opportunites,
  interactions,
  contacts,
  stats,
};
