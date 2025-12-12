import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, TrendingUp } from 'lucide-react';

interface Opportunite {
  id: string;
  nom_opportunite: string;
  description?: string;
  valeur_estimee?: number;
  probabilite?: number;
  statut?: string;
  date_cloture_prevue?: string;
  client_id?: string;
  contact_id?: string;
  client?: {
    nom_entreprise: string;
  };
  contact?: {
    prenom: string;
    nom: string;
  };
}

interface Client {
  id: string;
  nom_entreprise: string;
}

interface Contact {
  id: string;
  prenom: string;
  nom: string;
  client_id?: string;
}

export function OpportunitesManager() {
  const [opportunites, setOpportunites] = useState<Opportunite[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOpportunite, setEditingOpportunite] = useState<Opportunite | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nom_opportunite: '',
    description: '',
    valeur_estimee: '',
    probabilite: '50',
    statut: 'Nouveau',
    date_cloture_prevue: '',
    client_id: '',
    contact_id: ''
  });

  useEffect(() => {
    fetchOpportunites();
    fetchClients();
    fetchContacts();
  }, []);

  useEffect(() => {
    if (formData.client_id) {
      const clientContacts = contacts.filter(contact => contact.client_id === formData.client_id);
      setFilteredContacts(clientContacts);
    } else {
      setFilteredContacts(contacts);
    }
  }, [formData.client_id, contacts]);

  const fetchOpportunites = async () => {
    try {
      const { data, error } = await supabase
        .from('opportunites_2025_12_05_14_22')
        .select(`
          *,
          client:clients_2025_12_05_14_22(nom_entreprise),
          contact:contacts_2025_12_05_14_22(prenom, nom)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpportunites(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les opportunités",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients_2025_12_05_14_22')
        .select('id, nom_entreprise')
        .order('nom_entreprise');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des clients:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts_2025_12_05_14_22')
        .select('id, prenom, nom, client_id')
        .order('nom');

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des contacts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const opportuniteData = {
        nom_opportunite: formData.nom_opportunite,
        description: formData.description || null,
        valeur_estimee: formData.valeur_estimee ? parseFloat(formData.valeur_estimee) : null,
        probabilite: parseInt(formData.probabilite),
        statut: formData.statut,
        date_cloture_prevue: formData.date_cloture_prevue || null,
        client_id: formData.client_id || null,
        contact_id: formData.contact_id || null,
        user_id: user.id
      };

      if (editingOpportunite) {
        const { error } = await supabase
          .from('opportunites_2025_12_05_14_22')
          .update({ ...opportuniteData, updated_at: new Date().toISOString() })
          .eq('id', editingOpportunite.id);

        if (error) throw error;
        toast({
          title: "Succès",
          description: "Opportunité modifiée avec succès",
        });
      } else {
        const { error } = await supabase
          .from('opportunites_2025_12_05_14_22')
          .insert([opportuniteData]);

        if (error) throw error;
        toast({
          title: "Succès",
          description: "Opportunité ajoutée avec succès",
        });
      }

      setIsDialogOpen(false);
      setEditingOpportunite(null);
      resetForm();
      fetchOpportunites();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (opportunite: Opportunite) => {
    setEditingOpportunite(opportunite);
    setFormData({
      nom_opportunite: opportunite.nom_opportunite,
      description: opportunite.description || '',
      valeur_estimee: opportunite.valeur_estimee?.toString() || '',
      probabilite: opportunite.probabilite?.toString() || '50',
      statut: opportunite.statut || 'Nouveau',
      date_cloture_prevue: opportunite.date_cloture_prevue || '',
      client_id: opportunite.client_id || '',
      contact_id: opportunite.contact_id || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette opportunité ?')) return;

    try {
      const { error } = await supabase
        .from('opportunites_2025_12_05_14_22')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: "Succès",
        description: "Opportunité supprimée avec succès",
      });
      fetchOpportunites();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nom_opportunite: '',
      description: '',
      valeur_estimee: '',
      probabilite: '50',
      statut: 'Nouveau',
      date_cloture_prevue: '',
      client_id: '',
      contact_id: ''
    });
  };

  const openAddDialog = () => {
    setEditingOpportunite(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'Nouveau': return 'bg-blue-100 text-blue-800';
      case 'En cours': return 'bg-yellow-100 text-yellow-800';
      case 'Gagné': return 'bg-green-100 text-green-800';
      case 'Perdu': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Suivi des Opportunités</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle Opportunité
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOpportunite ? 'Modifier l\'Opportunité' : 'Nouvelle Opportunité'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nom_opportunite">Nom de l'opportunité *</Label>
                <Input
                  id="nom_opportunite"
                  value={formData.nom_opportunite}
                  onChange={(e) => setFormData({ ...formData, nom_opportunite: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valeur_estimee">Valeur estimée (€)</Label>
                  <Input
                    id="valeur_estimee"
                    type="number"
                    step="0.01"
                    value={formData.valeur_estimee}
                    onChange={(e) => setFormData({ ...formData, valeur_estimee: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="probabilite">Probabilité (%)</Label>
                  <Input
                    id="probabilite"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probabilite}
                    onChange={(e) => setFormData({ ...formData, probabilite: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="statut">Statut</Label>
                  <Select value={formData.statut} onValueChange={(value) => setFormData({ ...formData, statut: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nouveau">Nouveau</SelectItem>
                      <SelectItem value="En cours">En cours</SelectItem>
                      <SelectItem value="Gagné">Gagné</SelectItem>
                      <SelectItem value="Perdu">Perdu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_cloture_prevue">Date de clôture prévue</Label>
                  <Input
                    id="date_cloture_prevue"
                    type="date"
                    value={formData.date_cloture_prevue}
                    onChange={(e) => setFormData({ ...formData, date_cloture_prevue: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Client</Label>
                  <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value === "none" ? "" : value, contact_id: "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun client</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.nom_entreprise}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_id">Contact</Label>
                  <Select value={formData.contact_id} onValueChange={(value) => setFormData({ ...formData, contact_id: value === "none" ? "" : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun contact</SelectItem>
                      {filteredContacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.prenom} {contact.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  {editingOpportunite ? 'Modifier' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {opportunites.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">Aucune opportunité enregistrée</p>
            </CardContent>
          </Card>
        ) : (
          opportunites.map((opportunite) => (
            <Card key={opportunite.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="w-8 h-8 text-green-500" />
                    <div>
                      <CardTitle className="text-lg">{opportunite.nom_opportunite}</CardTitle>
                      {opportunite.client && (
                        <p className="text-sm text-blue-600">{opportunite.client.nom_entreprise}</p>
                      )}
                      {opportunite.contact && (
                        <p className="text-sm text-gray-600">
                          Contact: {opportunite.contact.prenom} {opportunite.contact.nom}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatutColor(opportunite.statut || 'Nouveau')}`}>
                      {opportunite.statut}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(opportunite)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(opportunite.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {opportunite.valeur_estimee && (
                    <div><strong>Valeur estimée:</strong> {opportunite.valeur_estimee.toLocaleString('fr-FR')} €</div>
                  )}
                  {opportunite.probabilite && (
                    <div><strong>Probabilité:</strong> {opportunite.probabilite}%</div>
                  )}
                  {opportunite.date_cloture_prevue && (
                    <div><strong>Date de clôture prévue:</strong> {new Date(opportunite.date_cloture_prevue).toLocaleDateString('fr-FR')}</div>
                  )}
                </div>
                {opportunite.description && (
                  <div className="mt-4">
                    <strong>Description:</strong> {opportunite.description}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}