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
import { Plus, Edit, Trash2, MessageSquare } from 'lucide-react';

interface Interaction {
  id: string;
  type_interaction: string;
  sujet?: string;
  description?: string;
  date_interaction: string;
  client_id?: string;
  contact_id?: string;
  opportunite_id?: string;
  client?: {
    nom_entreprise: string;
  };
  contact?: {
    prenom: string;
    nom: string;
  };
  opportunite?: {
    nom_opportunite: string;
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

interface Opportunite {
  id: string;
  nom_opportunite: string;
  client_id?: string;
}

export function InteractionsManager() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunites, setOpportunites] = useState<Opportunite[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [filteredOpportunites, setFilteredOpportunites] = useState<Opportunite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    type_interaction: 'Appel',
    sujet: '',
    description: '',
    date_interaction: new Date().toISOString().split('T')[0],
    client_id: '',
    contact_id: '',
    opportunite_id: ''
  });

  useEffect(() => {
    fetchInteractions();
    fetchClients();
    fetchContacts();
    fetchOpportunites();
  }, []);

  useEffect(() => {
    if (formData.client_id) {
      const clientContacts = contacts.filter(contact => contact.client_id === formData.client_id);
      setFilteredContacts(clientContacts);
      
      const clientOpportunites = opportunites.filter(opp => opp.client_id === formData.client_id);
      setFilteredOpportunites(clientOpportunites);
    } else {
      setFilteredContacts(contacts);
      setFilteredOpportunites(opportunites);
    }
  }, [formData.client_id, contacts, opportunites]);

  const fetchInteractions = async () => {
    try {
      const userData = localStorage.getItem('crm_user');
      if (!userData) throw new Error('Utilisateur non connecté');
      const user = JSON.parse(userData);

      const response = await supabase.functions.invoke('get_interactions_simple_2025_12_05_14_22', {
        body: {},
        headers: {
          'X-User-ID': user.id,
          'X-User-Role': user.role
        }
      });

      if (response.error || !response.data.success) {
        throw new Error(response.data?.error || 'Erreur lors du chargement');
      }

      setInteractions(response.data.data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les interactions",
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

  const fetchOpportunites = async () => {
    try {
      const { data, error } = await supabase
        .from('opportunites_2025_12_05_14_22')
        .select('id, nom_opportunite, client_id')
        .order('nom_opportunite');

      if (error) throw error;
      setOpportunites(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des opportunités:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const userData = localStorage.getItem('crm_user');
      if (!userData) throw new Error('Utilisateur non connecté');
      const user = JSON.parse(userData);

      const interactionData = {
        type_interaction: formData.type_interaction,
        sujet: formData.sujet || null,
        description: formData.description || null,
        date_interaction: new Date(formData.date_interaction).toISOString(),
        client_id: formData.client_id || null,
        contact_id: formData.contact_id || null,
        opportunite_id: formData.opportunite_id || null,
        user_id: user.id
      };

      if (editingInteraction) {
        const { error } = await supabase
          .from('interactions_2025_12_05_14_22')
          .update(interactionData)
          .eq('id', editingInteraction.id);

        if (error) throw error;
        toast({
          title: "Succès",
          description: "Interaction modifiée avec succès",
        });
      } else {
        const { error } = await supabase
          .from('interactions_2025_12_05_14_22')
          .insert([interactionData]);

        if (error) throw error;
        toast({
          title: "Succès",
          description: "Interaction ajoutée avec succès",
        });
      }

      setIsDialogOpen(false);
      setEditingInteraction(null);
      resetForm();
      fetchInteractions();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (interaction: Interaction) => {
    setEditingInteraction(interaction);
    setFormData({
      type_interaction: interaction.type_interaction,
      sujet: interaction.sujet || '',
      description: interaction.description || '',
      date_interaction: new Date(interaction.date_interaction).toISOString().split('T')[0],
      client_id: interaction.client_id || '',
      contact_id: interaction.contact_id || '',
      opportunite_id: interaction.opportunite_id || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette interaction ?')) return;

    try {
      const { error } = await supabase
        .from('interactions_2025_12_05_14_22')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: "Succès",
        description: "Interaction supprimée avec succès",
      });
      fetchInteractions();
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
      type_interaction: 'Appel',
      sujet: '',
      description: '',
      date_interaction: new Date().toISOString().split('T')[0],
      client_id: '',
      contact_id: '',
      opportunite_id: ''
    });
  };

  const openAddDialog = () => {
    setEditingInteraction(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Appel': return 'bg-blue-100 text-blue-800';
      case 'Email': return 'bg-green-100 text-green-800';
      case 'Réunion': return 'bg-purple-100 text-purple-800';
      case 'Note': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Historique des Interactions</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle Interaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingInteraction ? 'Modifier l\'Interaction' : 'Nouvelle Interaction'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type_interaction">Type d'interaction *</Label>
                  <Select value={formData.type_interaction} onValueChange={(value) => setFormData({ ...formData, type_interaction: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Appel">Appel</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="Réunion">Réunion</SelectItem>
                      <SelectItem value="Note">Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_interaction">Date</Label>
                  <Input
                    id="date_interaction"
                    type="date"
                    value={formData.date_interaction}
                    onChange={(e) => setFormData({ ...formData, date_interaction: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sujet">Sujet</Label>
                <Input
                  id="sujet"
                  value={formData.sujet}
                  onChange={(e) => setFormData({ ...formData, sujet: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_id">Client</Label>
                <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value === "none" ? "" : value, contact_id: "", opportunite_id: "" })}>
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

              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="opportunite_id">Opportunité</Label>
                  <Select value={formData.opportunite_id} onValueChange={(value) => setFormData({ ...formData, opportunite_id: value === "none" ? "" : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une opportunité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune opportunité</SelectItem>
                      {filteredOpportunites.map((opportunite) => (
                        <SelectItem key={opportunite.id} value={opportunite.id}>
                          {opportunite.nom_opportunite}
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
                  {editingInteraction ? 'Modifier' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {interactions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">Aucune interaction enregistrée</p>
            </CardContent>
          </Card>
        ) : (
          interactions.map((interaction) => (
            <Card key={interaction.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="w-8 h-8 text-blue-500" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(interaction.type_interaction)}`}>
                          {interaction.type_interaction}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(interaction.date_interaction).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {interaction.sujet && (
                        <CardTitle className="text-lg mt-1">{interaction.sujet}</CardTitle>
                      )}
                      {interaction.client && (
                        <p className="text-sm text-blue-600">{interaction.client.nom_entreprise}</p>
                      )}
                      {interaction.contact && (
                        <p className="text-sm text-gray-600">
                          Contact: {interaction.contact.prenom} {interaction.contact.nom}
                        </p>
                      )}
                      {interaction.opportunite && (
                        <p className="text-sm text-green-600">
                          Opportunité: {interaction.opportunite.nom_opportunite}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(interaction)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(interaction.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {interaction.description && (
                <CardContent>
                  <p className="text-sm">{interaction.description}</p>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}