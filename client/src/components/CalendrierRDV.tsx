import { useState, useEffect } from 'react';
import { rendezVous as rdvAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Lock } from 'lucide-react';
import { startOfWeek, endOfWeek, addWeeks, format, isSameDay, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RendezVous {
  id: string;
  client_id: string;
  titre: string;
  description?: string;
  date_heure: string;
  statut: string;
  entreprise?: string;
  client_nom?: string;
  client_prenom?: string;
  email?: string;
  telephone?: string;
  ville?: string;
  code_postal?: string;
  created_by_username?: string;
  is_mine?: boolean;
}

export function CalendrierRDV() {
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const { toast } = useToast();

  useEffect(() => {
    fetchRdvs();
  }, []);

  const fetchRdvs = async () => {
    try {
      setLoading(true);
      const data = await rdvAPI.getAll();
      setRdvs(data);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les rendez-vous",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, -1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const getRdvsForDay = (day: Date) => {
    return rdvs.filter(rdv => isSameDay(parseISO(rdv.date_heure), day))
      .sort((a, b) => new Date(a.date_heure).getTime() - new Date(b.date_heure).getTime());
  };

  const getStatutBadgeColor = (statut: string) => {
    switch(statut) {
      case 'planifie': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'confirme': return 'bg-green-100 text-green-800 border-green-300';
      case 'en_attente': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'en_attente_documents': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'valide': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'annule': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch(statut) {
      case 'planifie': return 'Planifié';
      case 'confirme': return 'Confirmé';
      case 'en_attente': return 'En attente';
      case 'en_attente_documents': return 'En attente docs';
      case 'valide': return 'Validé';
      case 'annule': return 'Annulé';
      default: return statut;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full">
      {/* Header avec navigation */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Calendrier des Rendez-vous</h2>
          <p className="text-muted-foreground">
            Semaine du {format(currentWeekStart, 'd MMMM', { locale: fr })} au {format(weekEnd, 'd MMMM yyyy', { locale: fr })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Aujourd'hui
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextWeek}>
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grille du calendrier */}
      <div className="grid grid-cols-7 gap-3 h-[calc(100vh-240px)]">
        {weekDays.map((day, index) => {
          const dayRdvs = getRdvsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={index}
              className={`border rounded-lg overflow-hidden flex flex-col ${
                isToday ? 'border-slate-400 border-2 bg-slate-50' : 'border-gray-200'
              }`}
            >
              {/* En-tête du jour */}
              <div className={`p-2 text-center border-b ${isToday ? 'bg-slate-800 text-white' : 'bg-gray-100'}`}>
                <div className="text-xs font-medium uppercase">
                  {format(day, 'EEE', { locale: fr })}
                </div>
                <div className={`text-lg font-bold ${isToday ? 'text-white' : 'text-gray-900'}`}>
                  {format(day, 'd')}
                </div>
              </div>

              {/* Liste des RDV du jour */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {dayRdvs.length === 0 ? (
                  <div className="text-center text-xs text-gray-400 py-4">
                    Aucun RDV
                  </div>
                ) : (
                  dayRdvs.map((rdv) => (
                    <Card 
                      key={rdv.id} 
                      className={`cursor-pointer hover:shadow-md transition-shadow ${
                        rdv.is_mine ? 'border-l-4 border-l-slate-600' : 'border-l-4 border-l-gray-300'
                      }`}
                    >
                      <CardContent className="p-3">
                        {rdv.is_mine ? (
                          /* RDV complet - Télépro ou Admin */
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <Calendar className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">
                                  {rdv.entreprise || rdv.titre}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {format(parseISO(rdv.date_heure), 'HH:mm')}
                                </p>
                              </div>
                            </div>

                            {rdv.client_prenom && rdv.client_nom && (
                              <p className="text-xs text-gray-600 truncate">
                                👤 {rdv.client_prenom} {rdv.client_nom}
                              </p>
                            )}

                            {rdv.telephone && (
                              <p className="text-xs text-gray-600 truncate">
                                📞 {rdv.telephone}
                              </p>
                            )}

                            {rdv.email && (
                              <p className="text-xs text-gray-600 truncate">
                                ✉️ {rdv.email}
                              </p>
                            )}

                            {rdv.created_by_username && (
                              <p className="text-xs text-gray-600 truncate">
                                Géré par: {rdv.created_by_username}
                              </p>
                            )}

                            <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getStatutBadgeColor(rdv.statut)}`}>
                              {getStatutLabel(rdv.statut)}
                            </div>
                          </div>
                        ) : (
                          /* Créneau masqué - Télépro qui voit un RDV d'un autre */
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <Lock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-500">
                                  Créneau occupé
                                </p>
                                <p className="text-xs text-gray-400">
                                  {format(parseISO(rdv.date_heure), 'HH:mm')}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">
                                {rdv.ville || '—'} {rdv.code_postal ? `(${rdv.code_postal})` : ''}
                              </span>
                            </div>

                            <div className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600 border border-gray-300">
                              Réservé
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}