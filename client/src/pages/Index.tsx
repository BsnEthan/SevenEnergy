import { useState, useEffect } from 'react';
import { auth } from '@/lib/api';
import { Auth } from '@/components/Auth';
import { Dashboard } from '@/components/Dashboard';
import { ClientsManager } from '@/components/ClientsManager';
import { CalendrierRDV } from '@/components/CalendrierRDV';
import { GestionUtilisateurs } from '@/components/GestionUtilisateurs';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { Building, Calendar, BarChart3, LogOut, Settings } from 'lucide-react';

type ActiveTab = 'dashboard' | 'clients' | 'calendrier' | 'utilisateurs';

const Index = () => {
  const [user, setUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  useEffect(() => {
    // Vérifier la session
    const userData = auth.getCurrentUser();
    const token = localStorage.getItem('crm_token');
    
    if (userData && token) {
      setUser(userData);
      setUserRole(userData.role);
      
      // Rediriger les téléprospecteurs vers la page Clients par défaut
      if (userData.role === 'teleprospecteur') {
        setActiveTab('clients');
      }
    }
    setLoading(false);
  }, []);

  const handleSignOut = async () => {
    auth.logout();
    setUser(null);
    setUserRole('');
  };

  const handleAuthSuccess = () => {
    // Recharger les données utilisateur après connexion
    const userData = auth.getCurrentUser();
    if (userData) {
      setUser(userData);
      setUserRole(userData.role);
      
      // Rediriger les téléprospecteurs vers la page Clients
      if (userData.role === 'teleprospecteur') {
        setActiveTab('clients');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Auth onAuthSuccess={handleAuthSuccess} />
        <Toaster />
      </>
    );
  }

  // Définir les menus avec leurs rôles autorisés
  const allMenuItems = [
    { 
      id: 'dashboard' as ActiveTab, 
      label: 'Tableau de Bord', 
      icon: BarChart3,
      roles: ['admin', 'manager', 'user'] // Pas téléprospecteur
    },
    { 
      id: 'clients' as ActiveTab, 
      label: 'Clients', 
      icon: Building,
      roles: ['admin', 'manager', 'user', 'teleprospecteur'] // Tous
    },
    { 
      id: 'calendrier' as ActiveTab, 
      label: 'Calendrier RDV', 
      icon: Calendar,
      roles: ['admin', 'manager', 'user', 'teleprospecteur'] // Tous
    },
    { 
      id: 'utilisateurs' as ActiveTab, 
      label: 'Gestion Utilisateurs', 
      icon: Settings,
      roles: ['admin'] // Admin uniquement
    },
  ];

  // Filtrer les menus selon le rôle de l'utilisateur
  const menuItems = allMenuItems.filter(item => 
    item.roles.includes(userRole)
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        // Vérifier si l'utilisateur a accès au dashboard
        if (userRole === 'teleprospecteur') {
          return <ClientsManager />;
        }
        return <Dashboard />;
      case 'clients':
        return <ClientsManager />;
      case 'calendrier':
        return <CalendrierRDV />;
      case 'utilisateurs':
        // Vérifier si l'utilisateur est admin
        if (userRole !== 'admin') {
          return <ClientsManager />;
        }
        return <GestionUtilisateurs />;
      default:
        return userRole === 'teleprospecteur' ? <ClientsManager /> : <Dashboard />;
    }
  };

  // Fonction pour obtenir le label du rôle en français
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'teleprospecteur':
        return 'Téléprospecteur';
      case 'manager':
        return 'Manager';
      case 'user':
        return 'Utilisateur';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src="LogoEthan2.png" 
                alt="Seven Energy Logo" 
                className="h-10 w-auto mr-3"
              />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.username || user.email}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                {getRoleLabel(userRole)}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-4">
              <ul className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          activeTab === item.id
                            ? 'bg-primary text-primary-foreground'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <Icon className="mr-3 h-5 w-5" />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className={activeTab === 'calendrier' ? 'w-full' : 'bg-white rounded-lg shadow p-6'}>
              {renderContent()}
            </div>
          </main>
        </div>
      </div>

      <Toaster />
    </div>
  );
};

export default Index;