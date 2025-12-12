import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, User } from 'lucide-react';

interface Contact {
  id: string;
  prenom: string;
  nom: string;
  poste?: string;
  email?: string;
  telephone?: string;
  telephone_mobile?: string;
  client_id?: string;
  client?: {
    nom_entreprise: string;
  };
}

interface Client {
  id: string;
  nom_entreprise: string;
}

export function ContactsManager() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    poste: '',
    email: '',
    telephone: '',
    telephone_mobile: '',
    client_id: ''
  });

  useEffect(() => {
    fetchContacts();
    fetchClients();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts_2025_12_05_14_22')
        .select(`
          *,
          client:clients_2025_12_05_14_22(nom_entreprise)
        `)
        .order('nom');

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les contacts",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const contactData = {
        ...formData,
        client_id: formData.client_id || null,
        user_id: user.id
      };

      if (editingContact) {
        const { error } = await supabase
          .from('contacts_2025_12_05_14_22')
          .update({ ...contactData, updated_at: new Date().toISOString() })
          .eq('id', editingContact.id);

        if (error) throw error;
        toast({
          title: "Succès",
          description: "Contact modifié avec succès",
        });
      } else {
        const { error } = await supabase
          .from('contacts_2025_12_05_14_22')
          .insert([contactData]);

        if (error) throw error;
        toast({
          title: "Succès",
          description: "Contact ajouté avec succès",
        });
      }

      setIsDialogOpen(false);
      setEditingContact(null);
      resetForm();
      fetchContacts();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      prenom: contact.prenom,
      nom: contact.nom,
      poste: contact.poste || '',
      email: contact.email || '',
      telephone: contact.telephone || '',
      telephone_mobile: contact.telephone_mobile || '',
      client_id: contact.client_id || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) return;

    try {
      const { error } = await supabase
        .from('contacts_2025_12_05_14_22')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: "Succès",
        description: "Contact supprimé avec succès",
      });
      fetchContacts();
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
      prenom: '',
      nom: '',
      poste: '',
      email: '',
      telephone: '',
      telephone_mobile: '',
      client_id: ''
    });
  };

  const openAddDialog = () => {
    setEditingContact(null);
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des Contacts</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingContact ? 'Modifier le Contact' : 'Nouveau Contact'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input
                    id="prenom"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="poste">Poste</Label>
                  <Input
                    id="poste"
                    value={formData.poste}
                    onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_id">Entreprise</Label>
                  <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value === "none" ? "" : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une entreprise" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune entreprise</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.nom_entreprise}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  <Label htmlFor="telephone_mobile">Téléphone mobile</Label>
                  <Input
                    id="telephone_mobile"
                    value={formData.telephone_mobile}
                    onChange={(e) => setFormData({ ...formData, telephone_mobile: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  {editingContact ? 'Modifier' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {contacts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">Aucun contact enregistré</p>
            </CardContent>
          </Card>
        ) : (
          contacts.map((contact) => (
            <Card key={contact.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <User className="w-8 h-8 text-gray-400" />
                    <div>
                      <CardTitle className="text-lg">
                        {contact.prenom} {contact.nom}
                      </CardTitle>
                      {contact.poste && (
                        <p className="text-sm text-gray-600">{contact.poste}</p>
                      )}
                      {contact.client && (
                        <p className="text-sm text-blue-600">{contact.client.nom_entreprise}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(contact)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(contact.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {contact.email && (
                    <div><strong>Email:</strong> {contact.email}</div>
                  )}
                  {contact.telephone && (
                    <div><strong>Téléphone:</strong> {contact.telephone}</div>
                  )}
                  {contact.telephone_mobile && (
                    <div><strong>Mobile:</strong> {contact.telephone_mobile}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}