
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface EmergencyAlert {
  id: string;
  user_id: string;
  type: 'medical' | 'safety' | 'general';
  status: 'active' | 'acknowledged' | 'responding' | 'completed';
  location_lat?: number;
  location_lng?: number;
  location_description?: string;
  description?: string;
  responder_id?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    phone: string;
  };
}

export const useEmergencyAlerts = (shouldSubscribe: boolean = true) => {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const subscriptionRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  const fetchAlerts = useCallback(async () => {
    if (!user || !profile || !shouldSubscribe) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('emergency_alerts')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (profile.user_type === 'user') {
        query = query.eq('user_id', user.id);
      } else if (profile.user_type === 'responder') {
        // Filter to show only alerts assigned to this responder
        query = query.eq('responder_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching alerts:', error);
        setAlerts([]);
      } else {
        console.log('Fetched alerts data:', data);
        const typedAlerts: EmergencyAlert[] = (data || []).map(alert => ({
          id: alert.id,
          user_id: alert.user_id,
          type: alert.type as 'medical' | 'safety' | 'general',
          status: alert.status as 'active' | 'acknowledged' | 'responding' | 'completed',
          location_lat: alert.location_lat,
          location_lng: alert.location_lng,
          location_description: alert.location_description,
          description: alert.description,
          responder_id: alert.responder_id,
          created_at: alert.created_at,
          updated_at: alert.updated_at,
          profiles: Array.isArray(alert.profiles) && alert.profiles.length > 0 
            ? alert.profiles[0] 
            : alert.profiles || undefined
        }));
        setAlerts(typedAlerts);
      }
    } catch (error) {
      console.error('Error in fetchAlerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.id, profile?.user_type, shouldSubscribe]);

  const cleanupSubscription = useCallback(() => {
    if (subscriptionRef.current && isSubscribedRef.current) {
      console.log('Cleaning up real-time subscription');
      try {
        subscriptionRef.current.unsubscribe();
      } catch (error) {
        console.log('Error during cleanup, but continuing:', error);
      }
      subscriptionRef.current = null;
      isSubscribedRef.current = false;
    }
  }, []);

  const setupSubscription = useCallback(() => {
    if (!user || !profile || isSubscribedRef.current || !shouldSubscribe) {
      return;
    }

    try {
      const channelName = `emergency_alerts_${user.id}_${Date.now()}`;
      console.log('Setting up subscription with channel:', channelName);

      const channel = supabase.channel(channelName);
      
      // Build filter for real-time subscription based on user type
      let filter: any = {
        event: '*',
        schema: 'public',
        table: 'emergency_alerts',
      };

      // Add filter for responders to only receive alerts assigned to them
      if (profile.user_type === 'responder') {
        filter.filter = `responder_id=eq.${user.id}`;
      } else if (profile.user_type === 'user') {
        filter.filter = `user_id=eq.${user.id}`;
      }
      
      channel
        .on(
          'postgres_changes',
          filter,
          (payload) => {
            console.log('Real-time alert update received:', payload);
            fetchAlerts();
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            isSubscribedRef.current = true;
          } else if (status === 'CLOSED') {
            isSubscribedRef.current = false;
          }
        });

      subscriptionRef.current = channel;
    } catch (error) {
      console.error('Error setting up subscription:', error);
    }
  }, [user?.id, profile?.id, fetchAlerts, shouldSubscribe]);

  useEffect(() => {
    if (!user || !profile || !shouldSubscribe) {
      setLoading(false);
      return;
    }

    // Clean up any existing subscription first
    cleanupSubscription();

    // Fetch initial data
    fetchAlerts();

    // Set up new subscription after a small delay
    const timeoutId = setTimeout(() => {
      setupSubscription();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      cleanupSubscription();
    };
  }, [user?.id, profile?.id, fetchAlerts, setupSubscription, cleanupSubscription, shouldSubscribe]);

  const createAlert = async (
    type: 'medical' | 'safety' | 'general',
    location: { lat: number; lng: number; description: string },
    description?: string
  ) => {
    if (!user) return { error: 'User not authenticated' };

    console.log('Creating alert with type:', type);

    const { data, error } = await supabase
      .from('emergency_alerts')
      .insert({
        user_id: user.id,
        type,
        location_lat: location.lat,
        location_lng: location.lng,
        location_description: location.description,
        description,
        status: 'active'
      })
      .select()
      .single();

    if (!error) {
      toast({
        title: "SOS Alert Sent!",
        description: `${type.toUpperCase()} emergency alert has been sent to responders.`,
        variant: "destructive"
      });
      fetchAlerts();
    }

    return { data, error };
  };

  const updateAlert = async (alertId: string, updates: Partial<EmergencyAlert>) => {
    console.log('Updating alert:', alertId, 'with:', updates);

    const { data, error } = await supabase
      .from('emergency_alerts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single();

    if (!error) {
      console.log('Alert updated successfully:', data);
      fetchAlerts();
    } else {
      console.error('Error updating alert:', error);
    }

    return { data, error };
  };

  const acknowledgeAlert = async (alertId: string) => {
    if (!user) return { error: 'User not authenticated' };

    const { data, error } = await updateAlert(alertId, {
      status: 'acknowledged',
      responder_id: user.id
    });

    if (!error) {
      toast({
        title: "Alert Acknowledged",
        description: "Emergency alert has been acknowledged."
      });
    }

    return { data, error };
  };

  const respondToAlert = async (alertId: string) => {
    if (!user) return { error: 'User not authenticated' };

    const { data, error } = await updateAlert(alertId, {
      status: 'responding',
      responder_id: user.id
    });

    if (!error) {
      toast({
        title: "Responding to Emergency",
        description: "Your response has been logged. Stay safe!",
        variant: "destructive"
      });
    }

    return { data, error };
  };

  const completeAlert = async (alertId: string) => {
    if (!user) return { error: 'User not authenticated' };

    const { data, error } = await updateAlert(alertId, {
      status: 'completed'
    });

    if (!error) {
      toast({
        title: "Emergency Completed",
        description: "Emergency has been marked as completed.",
      });
    }

    return { data, error };
  };

  return {
    alerts,
    loading,
    createAlert,
    updateAlert,
    acknowledgeAlert,
    respondToAlert,
    completeAlert,
    refetchAlerts: fetchAlerts
  };
};
