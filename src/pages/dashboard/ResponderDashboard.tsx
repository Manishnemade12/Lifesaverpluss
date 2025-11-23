import { useEffect, useMemo, useCallback, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Shield,
  MapPin,
  Clock,
  Ambulance,
  Phone,
  History,
  Flag,
  Navigation,
  User,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useResponderData } from "@/hooks/useResponderData";
import { useResponderLocation } from "@/hooks/useResponderLocation";
import { ResponderStatsCards } from "@/components/ResponderStatsCards";
import { NavigationButton } from "@/components/NavigationButton";
import { AnonymousReportsManager } from "@/components/AnonymousReportsManager";
import ResponderProfile from "@/components/ResponderProfile";
import EmergencyMap from "@/components/r/map";
import { Separator } from "@/components/ui/separator";
import AIRouteOptimizer from "@/components/AIRouteOptimizer";
import AIPredictiveHotspots from "@/components/AIPredictiveHotspots";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmergencyAlert {
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
  // Computed fields for UI compatibility
  user_name?: string;
  user_phone?: string;
  user_address?: string;
  latitude?: number;
  longitude?: number;
  emergency_type?: string;
}

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

const ResponderDashboard = () => {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();

  // Only subscribe to alerts when it actually makes sense (prevents loops / needless re-subscribes)
  const isVerified = !!profile?.responder_details?.is_verified;
  const { onDuty, updateDutyStatus, loading: responderLoading } = useResponderData();
  const shouldSubscribeAlerts = isVerified && onDuty;

  const {
    currentLocation,
    locationError,
    calculateDistance,
  } = useResponderLocation();

  const [showProfile, setShowProfile] = useState(false);
  const [sosRequests, setSosRequests] = useState<EmergencyAlert[]>([]);
  const [historyRequests, setHistoryRequests] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ===== helpers (memoized) =====
  const contactUser = useCallback((phone: string) => {
    if (!phone) return;
    window.open(`tel:${phone}`);
  }, []);

  const getAlertTypeColor = useCallback((type: string): string => {
    switch (type) {
      case "medical":
        return "bg-red-100 text-red-800";
      case "safety":
        return "bg-orange-100 text-orange-800";
      case "general":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "active":
        return "bg-red-100 text-red-800";
      case "acknowledged":
        return "bg-yellow-100 text-yellow-800";
      case "responding":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, []);

  const getAlertIcon = useCallback((type: string) => {
    switch (type) {
      case "medical":
        return <Ambulance className="h-4 w-4" />;
      case "safety":
        return <Shield className="h-4 w-4" />;
      case "general":
        return <Flag className="h-4 w-4" />;
      default:
        return <Flag className="h-4 w-4" />;
    }
  }, []);

  const getDistanceToRequest = useCallback(
    (request: EmergencyAlert) => {
      const lat = request.latitude ?? request.location_lat;
      const lng = request.longitude ?? request.location_lng;
      if (!currentLocation || !lat || !lng) return null;
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        Number(lat),
        Number(lng)
      );
      return distance.toFixed(1) + " km";
    },
    [currentLocation, calculateDistance]
  );

  const handleStatusUpdate = async (id: string, status: 'active' | 'acknowledged' | 'responding' | 'completed') => {
    const request = sosRequests.find((req) => req.id === id);
    
    // Optimistic update
    setSosRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status } : req))
    );
    
    // Move to history if completed
    if (status === 'completed') {
      if (request) {
        setHistoryRequests((prev) => [{ ...request, status }, ...prev]);
      }
      setTimeout(() => {
        setSosRequests((prev) => 
          prev.filter((req) => req.id !== id)
        );
      }, 500);
    }
    
    const updateData: { status: string; responder_id?: string } = { status };
    if (status === 'acknowledged' || status === 'responding') {
      updateData.responder_id = profile?.id;
    }
    
    const { error } = await (supabase
      .from('emergency_alerts' as never)
      .update(updateData as never)
      .eq('id', id) as unknown as { error: { message: string } | null });

    if (error) {
      // Revert optimistic update on error
      if (request) {
        setSosRequests((prev) =>
          prev.map((req) => (req.id === id ? request : req))
        );
      }
      toast({
        title: 'Error',
        description: 'Could not update status.',
        variant: 'destructive',
      });
    } else {
      const statusMessages: { [key: string]: string } = {
        'acknowledged': 'Request acknowledged. Responding now.',
        'responding': 'Responding to emergency.',
        'completed': 'Request completed successfully.',
      };
      toast({
        title: 'Status Updated',
        description: statusMessages[status] || `Request marked as ${status}.`,
      });
    }
  };

  // Fetch emergency alerts assigned to this responder
  useEffect(() => {
    const fetchEmergencyAlerts = async () => {
      if (!profile?.id || !shouldSubscribeAlerts) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch emergency alerts assigned to this responder
        const { data, error } = await (supabase
          .from('emergency_alerts' as never)
          .select(`
            *,
            profiles:user_id (
              first_name,
              last_name,
              phone
            )
          ` as never)
          .eq('responder_id', profile.id)
          .order('created_at', { ascending: false }) as unknown as { data: unknown; error: { message: string } | null });

        if (error) throw error;

        if (data) {
          // Map data to include computed fields for UI compatibility
          const mappedData: EmergencyAlert[] = (data as unknown as Array<Record<string, unknown>>).map((alert: Record<string, unknown>) => {
            const baseAlert = alert as unknown as EmergencyAlert;
            const profile = alert.profiles as ProfileData | undefined;
            return {
              ...baseAlert,
              user_name: profile
                ? `${(profile.first_name || '')} ${(profile.last_name || '')}`.trim()
                : 'Unknown User',
              user_phone: profile?.phone || '',
              user_address: (alert.location_description as string) || '',
              latitude: alert.location_lat as number,
              longitude: alert.location_lng as number,
              emergency_type: alert.type as string,
            };
          });

          // Separate active and history
          const active = mappedData.filter(r => r.status !== 'completed');
          const history = mappedData.filter(r => r.status === 'completed');
          setSosRequests(active);
          setHistoryRequests(history);
        }
      } catch (error) {
        console.error('Error fetching emergency alerts:', error);
        toast({
          title: 'Error',
          description: 'Failed to load emergency requests.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEmergencyAlerts();

    // Clean up previous subscription if any
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Real-time subscription for emergency alerts
    if (shouldSubscribeAlerts && profile?.id) {
      const channel = supabase
        .channel('realtime:responder_emergency_alerts')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'emergency_alerts',
            filter: `responder_id=eq.${profile.id}`,
          },
          async (payload) => {
            const newAlert = payload.new as Record<string, unknown>;
            
            // Fetch profile data for new/updated alerts
            if (newAlert?.user_id) {
              const { data: profileData } = await (supabase
                .from('profiles' as never)
                .select('first_name, last_name, phone')
                .eq('id', newAlert.user_id as string)
                .single() as unknown as { data: ProfileData | null });
              
              const profile = profileData as ProfileData | null;
              const mappedAlert: EmergencyAlert = {
                ...(newAlert as unknown as EmergencyAlert),
                profiles: profile ? {
                  first_name: profile.first_name || '',
                  last_name: profile.last_name || '',
                  phone: profile.phone || '',
                } : undefined,
                user_name: profile 
                  ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                  : 'Unknown User',
                user_phone: profile?.phone || '',
                user_address: (newAlert.location_description as string) || '',
                latitude: newAlert.location_lat as number,
                longitude: newAlert.location_lng as number,
                emergency_type: newAlert.type as string,
              };
              
              setSosRequests((prev) => {
                let updated = prev;
                if (payload.eventType === 'INSERT') {
                  if (mappedAlert.status !== 'completed') {
                    if (!prev.some((req) => req.id === mappedAlert.id)) {
                      updated = [mappedAlert, ...prev];
                    }
                  }
                } else if (payload.eventType === 'UPDATE') {
                  const isCompleted = mappedAlert.status === 'completed';
                  if (isCompleted) {
                    updated = prev.filter((req) => req.id !== mappedAlert.id);
                  } else {
                    updated = prev.map((req) =>
                      req.id === mappedAlert.id ? mappedAlert : req
                    );
                  }
                } else if (payload.eventType === 'DELETE') {
                  updated = prev.filter((req) => req.id !== (payload.old as { id: string }).id);
                }
                return updated;
              });

              setHistoryRequests((prev) => {
                let updated = prev;
                if (payload.eventType === 'INSERT') {
                  if (mappedAlert.status === 'completed') {
                    if (!prev.some((req) => req.id === mappedAlert.id)) {
                      updated = [mappedAlert, ...prev];
                    }
                  }
                } else if (payload.eventType === 'UPDATE') {
                  const isCompleted = mappedAlert.status === 'completed';
                  if (isCompleted) {
                    updated = prev.map((req) =>
                      req.id === mappedAlert.id ? mappedAlert : req
                    );
                    if (!prev.some((req) => req.id === mappedAlert.id)) {
                      updated = [mappedAlert, ...prev];
                    }
                  } else {
                    updated = prev.filter((req) => req.id !== mappedAlert.id);
                  }
                } else if (payload.eventType === 'DELETE') {
                  updated = prev.filter((req) => req.id !== (payload.old as { id: string }).id);
                }
                return updated;
              });
            }
          }
        )
        .subscribe();

      subscriptionRef.current = channel;
    }

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [profile?.id, shouldSubscribeAlerts, toast]);

  // Filter requests within 50km radius
  const filterRequestsWithinRadius = useCallback(
    (list: EmergencyAlert[]) => {
      if (!currentLocation) return list;
      return list.filter((request) => {
        const lat = request.latitude ?? request.location_lat;
        const lng = request.longitude ?? request.location_lng;
        if (!lat || !lng) return false;
        const distance = calculateDistance(
          currentLocation.lat,
          currentLocation.lng,
          Number(lat),
          Number(lng)
        );
        return distance <= 50;
      });
    },
    [currentLocation, calculateDistance]
  );

  // ===== derived data (memoized) =====
  const visibleRequests = useMemo(() => {
    if (!shouldSubscribeAlerts) return [];
    return filterRequestsWithinRadius(sosRequests);
  }, [sosRequests, filterRequestsWithinRadius, shouldSubscribeAlerts]);

  // ===== loading gate to avoid early mounts thrashing state =====
  const isReady = useMemo(
    () => typeof isVerified !== "undefined" && typeof onDuty !== "undefined",
    [isVerified, onDuty]
  );

  if (!isReady || loading || responderLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-red-50/20">
      {/* World-Class Professional Header */}
      <header className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Brand Section - Left */}
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 via-orange-700 to-gray-900 bg-clip-text text-transparent">
                  Responder Dashboard
                </span>
                {profile && (
                  <span className="text-xs sm:text-sm text-gray-600 hidden sm:flex items-center gap-1.5 mt-0.5">
                    <User className="h-3 w-3" />
                    {profile.first_name} {profile.last_name} • {profile.responder_details?.responder_type}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons - Right Side */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProfile(true)}
                className="hidden sm:flex items-center gap-2 hover:bg-gray-50 transition-all duration-200"
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProfile(true)}
                className="sm:hidden p-2"
                title="Profile"
              >
                <User className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signOut}
                className="hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all duration-200"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Exit</span>
              </Button>
            </div>
          </div>

          <Separator className="my-3" />

          {/* Status Bar - Enhanced Design */}
          <div className="pb-4">
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              {isVerified && (
                <div className="flex items-center justify-center lg:justify-start">
                  <div className="flex items-center space-x-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl px-4 py-2.5 shadow-sm border border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">
                      Duty Status:
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${!onDuty ? 'text-gray-900' : 'text-gray-500'}`}>Off</span>
                      <Switch 
                        checked={onDuty} 
                        onCheckedChange={updateDutyStatus}
                        className="data-[state=checked]:bg-green-600"
                      />
                      <span className={`text-sm font-medium ${onDuty ? 'text-gray-900' : 'text-gray-500'}`}>On</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2">
                <Badge
                  variant={onDuty ? "default" : "secondary"}
                  className={`${
                    onDuty 
                      ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-sm px-3 py-1" 
                      : "bg-gray-500 text-white px-3 py-1"
                  } font-semibold`}
                >
                  {onDuty ? "ON DUTY" : "OFF DUTY"}
                </Badge>

                {!isVerified && (
                  <Badge
                    variant="outline"
                    className="text-yellow-700 border-yellow-300 bg-yellow-50/50 hover:bg-yellow-50 px-3 py-1"
                  >
                    PENDING VERIFICATION
                  </Badge>
                )}

                {currentLocation && (
                  <Badge
                    variant="outline"
                    className="text-green-700 border-green-300 bg-green-50/50 hover:bg-green-50 px-3 py-1"
                  >
                    <Navigation className="h-3 w-3 mr-1.5" />
                    <span className="hidden sm:inline">Location Active</span>
                    <span className="sm:hidden">GPS</span>
                  </Badge>
                )}

                {locationError && (
                  <Badge
                    variant="outline"
                    className="text-red-700 border-red-300 bg-red-50/50 hover:bg-red-50 px-3 py-1"
                  >
                    <span className="hidden sm:inline">Location Error</span>
                    <span className="sm:hidden">GPS Error</span>
                  </Badge>
                )}

                <Badge
                  variant="outline"
                  className="text-blue-700 border-blue-300 bg-blue-50/50 hover:bg-blue-50 px-3 py-1"
                >
                  <AlertTriangle className="h-3 w-3 mr-1.5" />
                  <span className="hidden sm:inline">{visibleRequests.length} Active Requests</span>
                  <span className="sm:hidden">{visibleRequests.length}</span>
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {!isVerified && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start space-x-3">
                <Clock className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-800 text-sm sm:text-base">
                    Account Pending Verification
                  </h3>
                  <p className="text-yellow-700 text-xs sm:text-sm mt-1">
                    Your responder account is currently being verified. You will
                    receive access to emergency alerts once your credentials are
                    approved.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Tabs Navigation */}
        <Tabs defaultValue="alerts" className="space-y-6 w-full">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-1.5">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto bg-transparent gap-1">
              <TabsTrigger 
                value="alerts"
                className="text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-lg font-semibold"
              >
                <AlertTriangle className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Active Requests</span>
                <span className="sm:hidden">Alerts</span>
                {visibleRequests.length > 0 && (
                  <Badge className="ml-2 bg-red-600 text-white text-[10px] px-1.5 py-0">
                    {visibleRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="map"
                className="text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-lg font-semibold"
              >
                <MapPin className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Area Map</span>
                <span className="sm:hidden">Map</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history"
                className="text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-lg font-semibold"
              >
                <History className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Response History</span>
                <span className="sm:hidden">History</span>
                {historyRequests.length > 0 && (
                  <Badge className="ml-2 bg-green-600 text-white text-[10px] px-1.5 py-0">
                    {historyRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="reports"
                className="text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-lg font-semibold"
              >
                <Flag className="h-4 w-4 sm:mr-1.5" />
                Reports
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="alerts" className="space-y-6 mt-6">
            <ResponderStatsCards sosRequests={sosRequests} historyRequests={historyRequests} />

            {/* AI Route Optimizer */}
            {visibleRequests.length > 1 && currentLocation && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 shadow-sm">
                <AIRouteOptimizer
                  alerts={visibleRequests.map(r => ({
                    id: r.id,
                    location_lat: Number(r.latitude ?? r.location_lat) || 0,
                    location_lng: Number(r.longitude ?? r.location_lng) || 0,
                    type: r.emergency_type || r.type,
                    status: r.status,
                    description: r.description || undefined,
                  }))}
                  responderLocation={currentLocation}
                  onNavigate={(requestId) => {
                    const request = visibleRequests.find(r => r.id === requestId);
                    const lat = request?.latitude ?? request?.location_lat;
                    const lng = request?.longitude ?? request?.location_lng;
                    if (request && lat && lng) {
                      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                    }
                  }}
                />
              </div>
            )}

            {/* Enhanced Emergency Requests Card */}
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 rounded-t-lg border-b border-red-100">
                <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-md">
                      <Ambulance className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
                        Emergency Requests
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1 font-medium">
                        SOS requests assigned to you
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="outline"
                      className="bg-red-100 text-red-700 border-red-300 font-semibold px-3 py-1"
                    >
                      {visibleRequests.length} Active
                    </Badge>
                    {onDuty && (
                      <Badge
                        variant="outline"
                        className="bg-green-100 text-green-700 border-green-300 font-semibold px-3 py-1"
                      >
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        Live
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-4 sm:px-6 py-6">
                {!isVerified && (
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl p-5 mb-6">
                    <div className="flex items-start space-x-3">
                      <Clock className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-yellow-800 text-base mb-1">
                          Verification Required
                        </h4>
                        <p className="text-yellow-700 text-sm">
                          Complete your account verification to start receiving emergency requests.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isVerified && !onDuty && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 mb-6">
                    <div className="flex items-start space-x-3">
                      <Shield className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-blue-800 text-base mb-1">
                          Currently Off Duty
                        </h4>
                        <p className="text-blue-700 text-sm">
                          Switch to "On Duty" to start receiving emergency requests in your area.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {visibleRequests.map((request) => {
                    const distance = getDistanceToRequest(request);

                    return (
                      <Card
                        key={request.id}
                        className={`border-l-4 hover:shadow-xl transition-all duration-300 bg-white rounded-lg overflow-hidden ${
                          request.status === 'active' ? 'border-l-red-500 shadow-red-50' :
                          request.status === 'acknowledged' ? 'border-l-blue-500 shadow-blue-50' :
                          'border-l-gray-500'
                        }`}
                      >
                        <CardContent className="p-5 sm:p-6 bg-gradient-to-br from-white to-gray-50/50">
                          <div className="flex flex-col space-y-4 lg:flex-row lg:items-start lg:justify-between lg:space-y-0">
                            <div className="flex items-start space-x-4 flex-1 min-w-0">
                              <div className="flex-shrink-0 p-2.5 bg-gradient-to-br from-red-100 to-red-200 rounded-lg shadow-sm">
                                {getAlertIcon(request.emergency_type || request.type)}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                  <Badge
                                    className={`${getAlertTypeColor(request.emergency_type || request.type)} text-xs font-medium px-2 py-0.5`}
                                  >
                                    {(request.emergency_type || request.type).toUpperCase()}
                                  </Badge>
                                  <Badge
                                    className={`${getStatusColor(request.status)} text-xs font-medium px-2 py-0.5`}
                                  >
                                    {request.status.toUpperCase()}
                                  </Badge>
                                  {distance && (
                                    <Badge
                                      variant="outline"
                                      className="text-blue-600 border-blue-200 text-xs px-2 py-0.5"
                                    >
                                      <MapPin className="h-3 w-3 mr-1" />
                                      {distance}
                                    </Badge>
                                  )}
                                  <div className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatTime(request.created_at)}</span>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h3 className="font-bold text-gray-900 text-base sm:text-lg">
                                    {request.user_name}
                                  </h3>
                                  
                                  <p className="text-sm text-gray-700">
                                    <span className="font-semibold">Location: </span>
                                    {request.user_address || request.location_description || `${(request.latitude ?? request.location_lat)?.toFixed(4)}, ${(request.longitude ?? request.location_lng)?.toFixed(4)}`}
                                  </p>

                                  {request.description && (
                                    <p className="text-sm text-gray-700 break-words">
                                      <span className="font-semibold">Description: </span>
                                      {request.description}
                                    </p>
                                  )}

                                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <Phone className="h-4 w-4" />
                                    <a 
                                      href={`tel:${request.user_phone}`}
                                      className="text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                      {request.user_phone}
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons - Enhanced */}
                            <div className="flex flex-col space-y-2 lg:w-44 lg:flex-shrink-0">
                              {request.user_phone && (
                                <Button
                                  size="sm"
                                  onClick={() => contactUser(request.user_phone)}
                                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white w-full shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
                                >
                                  <Phone className="h-4 w-4 mr-2" />
                                  Contact
                                </Button>
                              )}

                              {(request.status === 'active') && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusUpdate(request.id, 'acknowledged')}
                                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white w-full shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
                                >
                                  <Clock className="h-4 w-4 mr-2" />
                                  Acknowledge
                                </Button>
                              )}

                              {(request.status === 'acknowledged' || request.status === 'responding') && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusUpdate(request.id, 'completed')}
                                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white w-full shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
                                >
                                  <History className="h-4 w-4 mr-2" />
                                  Complete
                                </Button>
                              )}

                              <NavigationButton
                                userLat={currentLocation?.lat}
                                userLng={currentLocation?.lng}
                                destLat={Number(request.latitude ?? request.location_lat)}
                                destLng={Number(request.longitude ?? request.location_lng)}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {visibleRequests.length === 0 && isVerified && onDuty && (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Shield className="h-10 w-10 text-green-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">All Clear</h3>
                      <p className="text-gray-600 text-sm max-w-sm mx-auto">
                        No active emergency requests assigned to you. You'll be notified immediately when new emergencies are reported.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map" className="space-y-6 mt-6">
            {/* AI Predictive Hotspots - Enhanced */}
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              <AIPredictiveHotspots
                emergencyHistory={[...sosRequests, ...historyRequests].map(r => ({
                  location_lat: Number(r.latitude ?? r.location_lat) || 0,
                  location_lng: Number(r.longitude ?? r.location_lng) || 0,
                  type: r.emergency_type || r.type,
                  created_at: r.created_at || new Date().toISOString(),
                }))}
                currentLocation={currentLocation}
              />
            </div>

            {/* Enhanced Map Card */}
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-t-lg border-b border-blue-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
                      Area Coverage Map
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1 font-medium">
                      Visual overview of emergency requests in your area
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="h-[500px] sm:h-[600px] w-full rounded-xl overflow-hidden border-2 border-gray-200 shadow-inner">
                  <EmergencyMap userLocation={currentLocation ? [currentLocation.lat, currentLocation.lng] : null} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced History Tab */}
          <TabsContent value="history" className="space-y-6 mt-6">
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg border-b border-green-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md">
                    <History className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
                      Response History
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1 font-medium">
                      Previously handled emergency requests
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 font-semibold px-3 py-1">
                    {historyRequests.length} Completed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 py-6">
                <div className="space-y-4">
                  {historyRequests.map((request) => (
                    <div 
                      key={request.id} 
                      className="border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50/50"
                    >
                      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="p-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg">
                            {getAlertIcon(request.emergency_type || request.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge className={`${getAlertTypeColor(request.emergency_type || request.type)} text-xs font-medium px-2 py-0.5`}>
                                {(request.emergency_type || request.type).toUpperCase()}
                              </Badge>
                              <Badge className={`${getStatusColor(request.status)} text-xs font-medium px-2 py-0.5`}>
                                {request.status.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="font-bold text-lg text-gray-900 mb-1">
                              {request.user_name}
                            </p>
                            <p className="text-sm text-gray-600 mb-1">
                              {request.user_address || request.location_description || `${(request.latitude ?? request.location_lat)?.toFixed(4)}, ${(request.longitude ?? request.location_lng)?.toFixed(4)}`}
                            </p>
                            {request.description && (
                              <p className="text-sm text-gray-500 italic mb-2">
                                {request.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatTime(request.created_at)}</span>
                              </div>
                              {request.user_phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{request.user_phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {historyRequests.length === 0 && (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <History className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">No History Yet</h3>
                      <p className="text-gray-600 text-sm max-w-sm mx-auto">
                        Resolved and dismissed requests will appear here.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Reports Tab */}
          <TabsContent value="reports" className="space-y-6 mt-6">
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              <AnonymousReportsManager />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ResponderProfile
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        onProfileUpdate={() => setShowProfile(false)}
      />
    </div>
  );
};

export default ResponderDashboard;
