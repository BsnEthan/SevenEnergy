import { useState, useEffect } from 'react';
import { clients as clientsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Building2, Calendar, Phone, Mail, User } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Client {
  id: string;
  nom: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  entreprise?: string;
  poste?: string;
  adresse?: string;
  ville?: string;
  code_postal?: string;
  pays?: string;
  prenom_contact?: string;
  nom_contact?: string;
  telephone_contact?: string;
  email_contact?: string;
  date_rdv?: string;
  type_rdv?: string;
  statut_rdv?: string;
  notes_rdv?: string;
  notes?: string;
  created_by_username?: string;
  user_id?: string;
  created_at: string;
  updated_at?: string;
}

export function ClientsManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nom: '',
    adresse: '',
    ville: '',
    code_postal: '',
    pays: 'France',
    telephone: '',
    email: '',
    prenom_contact: '',
    nom_contact: '',
    telephone_contact: '',
    email_contact: '',
    date_rdv: '',
    type_rdv: '',
    statut_rdv: 'en_attente',
    notes_rdv: '',
    notes: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await clientsAPI.getAll();
      setClients(data);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const toNullIfEmpty = (value: string) => value.trim() === '' ? null : value.trim();

      const apiData = {
        nom: toNullIfEmpty(formData.nom_contact) || toNullIfEmpty(formData.nom) || 'Client',
        prenom: toNullIfEmpty(formData.prenom_contact),
        email: toNullIfEmpty(formData.email_contact) || toNullIfEmpty(formData.email),
        telephone: toNullIfEmpty(formData.telephone_contact) || toNullIfEmpty(formData.telephone),
        entreprise: toNullIfEmpty(formData.nom),
        poste: null,
        adresse: toNullIfEmpty(formData.adresse),
        ville: toNullIfEmpty(formData.ville),
        code_postal: toNullIfEmpty(formData.code_postal),
        pays: formData.pays || 'France',
        prenom_contact: toNullIfEmpty(formData.prenom_contact),
        nom_contact: toNullIfEmpty(formData.nom_contact),
        telephone_contact: toNullIfEmpty(formData.telephone_contact),
        email_contact: toNullIfEmpty(formData.email_contact),
        date_rdv: toNullIfEmpty(formData.date_rdv),
        type_rdv: toNullIfEmpty(formData.type_rdv),
        statut_rdv: formData.statut_rdv || 'en_attente',
        notes_rdv: toNullIfEmpty(formData.notes_rdv),
        notes: toNullIfEmpty(formData.notes)
      };

      if (editingClient) {
        await clientsAPI.update(editingClient.id, apiData);
        toast({
          title: "Client modifié",
          description: "Les informations ont été mises à jour",
        });
      } else {
        await clientsAPI.create(apiData);
        toast({
          title: "Client créé",
          description: "Le nouveau client a été ajouté",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchClients();
    } catch (error: any) {
      console.error('Erreur complète:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'enregistrement",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      nom: client.entreprise || '',
      adresse: client.adresse || '',
      ville: client.ville || '',
      code_postal: client.code_postal || '',
      pays: client.pays || 'France',
      telephone: client.telephone || '',
      email: client.email || '',
      prenom_contact: client.prenom_contact || client.prenom || '',
      nom_contact: client.nom_contact || client.nom || '',
      telephone_contact: client.telephone_contact || client.telephone || '',
      email_contact: client.email_contact || client.email || '',
      date_rdv: client.date_rdv || '',
      type_rdv: client.type_rdv || '',
      statut_rdv: client.statut_rdv || 'en_attente',
      notes_rdv: client.notes_rdv || '',
      notes: client.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteClientId) return;

    try {
      await clientsAPI.delete(deleteClientId);
      toast({
        title: "Client supprimé",
        description: "Le client et son rendez-vous associé ont été supprimés",
      });
      setDeleteClientId(null);
      fetchClients();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      adresse: '',
      ville: '',
      code_postal: '',
      pays: 'France',
      telephone: '',
      email: '',
      prenom_contact: '',
      nom_contact: '',
      telephone_contact: '',
      email_contact: '',
      date_rdv: '',
      type_rdv: '',
      statut_rdv: 'en_attente',
      notes_rdv: '',
      notes: ''
    });
    setEditingClient(null);
  };

  const getStatutBadgeColor = (statut: string) => {
    switch(statut) {
      case 'planifie': return 'bg-blue-100 text-blue-800';
      case 'confirme': return 'bg-green-100 text-green-800';
      case 'en_attente': return 'bg-yellow-100 text-yellow-800';
      case 'en_attente_documents': return 'bg-orange-100 text-orange-800';
      case 'valide': return 'bg-emerald-100 text-emerald-800';
      case 'annule': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch(statut) {
      case 'planifie': return 'Planifié';
      case 'confirme': return 'Confirmé';
      case 'en_attente': return 'En attente';
      case 'en_attente_documents': return 'En attente de documents';
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion des Clients</h2>
          <p className="text-muted-foreground">Gérez vos clients et leurs informations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Modifier le client' : 'Nouveau Client'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Informations Entreprise */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom de l'entreprise *</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input
                    id="adresse"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ville">Ville</Label>
                    <Input
                      id="ville"
                      value={formData.ville}
                      onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code_postal">Code postal</Label>
                    <Input
                      id="code_postal"
                      value={formData.code_postal}
                      onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pays">Pays</Label>
                    <Input
                      id="pays"
                      value={formData.pays}
                      onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input
                      id="telephone"
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Informations de Contact */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Informations de Contact</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prenom_contact">Prénom du contact</Label>
                      <Input
                        id="prenom_contact"
                        value={formData.prenom_contact}
                        onChange={(e) => setFormData({ ...formData, prenom_contact: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nom_contact">Nom du contact</Label>
                      <Input
                        id="nom_contact"
                        value={formData.nom_contact}
                        onChange={(e) => setFormData({ ...formData, nom_contact: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="telephone_contact">Téléphone du contact</Label>
                      <Input
                        id="telephone_contact"
                        value={formData.telephone_contact}
                        onChange={(e) => setFormData({ ...formData, telephone_contact: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email_contact">Email du contact</Label>
                      <Input
                        id="email_contact"
                        type="email"
                        value={formData.email_contact}
                        onChange={(e) => setFormData({ ...formData, email_contact: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Rendez-vous */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Rendez-vous</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_rdv">Date du rendez-vous</Label>
                    <Input
                      id="date_rdv"
                      type="datetime-local"
                      value={formData.date_rdv}
                      onChange={(e) => setFormData({ ...formData, date_rdv: e.target.value })}
                    />
                  </div>

                  {/* Type de RDV */}
                  <div className="space-y-2">
                    <Label>Type de rendez-vous</Label>
                    <div className="flex gap-6">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.type_rdv === 'visio'}
                          onChange={() => setFormData({ ...formData, type_rdv: 'visio' })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium">Visio</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.type_rdv === 'presentiel'}
                          onChange={() => setFormData({ ...formData, type_rdv: 'presentiel' })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium">Présentiel</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="statut_rdv">Statut du RDV</Label>
                    <Select value={formData.statut_rdv} onValueChange={(value) => setFormData({ ...formData, statut_rdv: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en_attente">En attente</SelectItem>
                        <SelectItem value="planifie">Planifié</SelectItem>
                        <SelectItem value="confirme">Confirmé</SelectItem>
                        <SelectItem value="en_attente_documents">En attente de documents</SelectItem>
                        <SelectItem value="valide">Validé</SelectItem>
                        <SelectItem value="annule">Annulé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes_rdv">Notes du rendez-vous</Label>
                    <Textarea
                      id="notes_rdv"
                      value={formData.notes_rdv}
                      onChange={(e) => setFormData({ ...formData, notes_rdv: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Notes générales */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes générales</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
                  {editingClient ? 'Modifier' : 'Ajouter le Client'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des clients en cartes */}
      <div className="space-y-4">
        {clients.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucun client enregistré
            </CardContent>
          </Card>
        ) : (
          clients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="text-lg font-semibold">{client.entreprise || client.nom}</h3>
                        {client.created_by_username && (
                          <p className="text-sm text-blue-600">
                            Géré par: {client.created_by_username}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{client.telephone || client.telephone_contact || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{client.email || client.email_contact || '-'}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>RDV: {client.date_rdv ? new Date(client.date_rdv).toLocaleDateString('fr-FR') : 'Non planifié'}</span>
                          </div>
                          {client.type_rdv && (
                            <div className="ml-6 mt-1">
                              <span className="text-xs font-medium text-gray-700">
                                {client.type_rdv === 'visio' ? 'Visio' : 'Présentiel'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {client.statut_rdv && (
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatutBadgeColor(client.statut_rdv)}`}>
                            {getStatutLabel(client.statut_rdv)}
                          </span>
                        </div>
                      )}

                      {((client.prenom_contact && client.nom_contact) || (client.prenom && client.nom)) && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>Contact: {client.prenom_contact || client.prenom} {client.nom_contact || client.nom}</span>
                        </div>
                      )}

                      {client.notes && (
                        <p className="text-sm text-muted-foreground italic">{client.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteClientId(client.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={!!deleteClientId} onOpenChange={() => setDeleteClientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le client et son rendez-vous associé seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}