import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Calendar, Users } from 'lucide-react';
import { stats as statsAPI } from '@/lib/api';

interface Stats {
  total_clients: number;
  total_rdv: number;
  rdv_aujourdhui: number;
  rdv_confirmes: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    total_clients: 0,
    total_rdv: 0,
    rdv_aujourdhui: 0,
    rdv_confirmes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await statsAPI.getAll();
      setStats(data);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Clients',
      value: stats.total_clients,
      icon: Building2,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
    {
      title: 'RDV Planifiés',
      value: stats.total_rdv,
      icon: Calendar,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
    {
      title: "RDV Aujourd'hui",
      value: stats.rdv_aujourdhui,
      icon: Calendar,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
    {
      title: 'RDV Confirmés',
      value: stats.rdv_confirmes,
      icon: Users,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tableau de Bord</h2>
        <p className="text-muted-foreground">Vue d'ensemble de votre activité</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Vous pouvez ajouter d'autres widgets ici */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-8">
              Statistiques détaillées à venir...
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Rendez-vous à venir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-8">
              Prochains rendez-vous...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}