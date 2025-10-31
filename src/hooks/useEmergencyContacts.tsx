
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string;
  created_at: string;
}

export const useEmergencyContacts = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contacts:', error);
      } else {
        setContacts(data || []);
      }
      setLoading(false);
    };

    fetchContacts();

    // Set up real-time subscription
    const channel = supabase
      .channel('emergency_contacts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_contacts',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time contact update:', payload);
          fetchContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addContact = async (name: string, phone: string, email: string = '') => {
    if (!user) return { error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('emergency_contacts')
      .insert([{
        user_id: user.id,
        name,
        phone,
        email
      }])
      .select()
      .single();

    if (!error) {
      toast({
        title: "Contact Added",
        description: `${name} has been added to your emergency contacts.`
      });
    }

    return { data, error };
  };

  const removeContact = async (contactId: string) => {
    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', contactId);

    if (!error) {
      toast({
        title: "Contact Removed",
        description: "Emergency contact has been removed."
      });
    }

    return { error };
  };

  return {
    contacts,
    loading,
    addContact,
    removeContact
  };
};
