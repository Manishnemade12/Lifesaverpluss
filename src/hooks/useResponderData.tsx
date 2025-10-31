
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export const useResponderData = () => {
  const [responderStats, setResponderStats] = useState({
    todayResponses: 0,
    weeklyResponses: 0,
    totalResponses: 0,
    avgResponseTime: 0
  });
  const [onDuty, setOnDuty] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    if (!profile?.responder_details) {
      setLoading(false);
      return;
    }

    const fetchResponderData = async () => {
      // Get responder duty status
      const { data: responderData } = await supabase
        .from('responder_details')
        .select('is_on_duty')
        .eq('id', user.id)
        .single();

      if (responderData) {
        setOnDuty(responderData.is_on_duty);
      }

      // Calculate stats from emergency_alerts
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Today's responses
      const { count: todayCount } = await supabase
        .from('emergency_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('responder_id', user.id)
        .gte('created_at', today.toISOString());

      // Weekly responses
      const { count: weeklyCount } = await supabase
        .from('emergency_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('responder_id', user.id)
        .gte('created_at', weekAgo.toISOString());

      // Total responses
      const { count: totalCount } = await supabase
        .from('emergency_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('responder_id', user.id);

      setResponderStats({
        todayResponses: todayCount || 0,
        weeklyResponses: weeklyCount || 0,
        totalResponses: totalCount || 0,
        avgResponseTime: 5.2 // This would need more complex calculation
      });

      setLoading(false);
    };

    fetchResponderData();

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [user, profile]);

  const updateDutyStatus = async (newStatus: boolean) => {
    if (!user) return;

    const { error } = await supabase
      .from('responder_details')
      .update({ is_on_duty: newStatus })
      .eq('id', user.id);

    if (!error) {
      setOnDuty(newStatus);
      toast({
        title: newStatus ? "Now On Duty" : "Off Duty",
        description: newStatus 
          ? "You will receive emergency alerts in your area"
          : "You will not receive new emergency alerts"
      });
    }
  };

  return {
    responderStats,
    onDuty,
    loading,
    updateDutyStatus
  };
};
