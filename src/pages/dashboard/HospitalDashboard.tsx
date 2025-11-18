import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Clock, User, AlertTriangle, History, Building2, Phone, Navigation, Heart, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import MedicalReportView from '@/components/MedicalReportView';
import HospitalMap from '@/components/HospitalMap';
import AIPrioritySuggestor from '@/components/AIPrioritySuggestor';
import AISmartTriage from '@/components/AISmartTriage';

// ProfileModal for updating profile according to your schema
const ProfileModal = ({ open, onClose, profile, onProfileUpdate }: any) => {
  const [form, setForm] = useState({
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    phone: profile?.phone || "",
    email: profile?.email || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      phone: profile?.phone || "",
      email: profile?.email || "",
    });
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    await onProfileUpdate(form);
    setSaving(false);
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md shadow-lg">
        <h2 className="text-lg font-bold mb-4">Update Profile</h2>
        <div className="space-y-3">
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            name="first_name"
            placeholder="First Name"
            value={form.first_name}
            onChange={handleChange}
          />
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            name="last_name"
            placeholder="Last Name"
            value={form.last_name}
            onChange={handleChange}
          />
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            name="phone"
            placeholder="Phone"
            value={form.phone}
            onChange={handleChange}
          />
          <input
            className="w-full border rounded px-3 py-2 text-sm bg-gray-100"
            name="email"
            placeholder="Email"
            value={form.email}
            disabled
          />
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Stats Cards Component - Enhanced Professional Design
const HospitalStatsCards = ({ sosRequests, historyRequests }: any) => {
  const activeCount = sosRequests.filter((r: any) => r.status === 'active' || r.status === 'pending').length;
  const acknowledgedCount = sosRequests.filter((r: any) => r.status === 'acknowledged').length;
  const resolvedToday = historyRequests.filter((r: any) => {
    if (r.status !== 'resolved') return false;
    const today = new Date();
    const requestDate = new Date(r.updated_at || r.created_at);
    return requestDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Active Emergencies Card */}
      <Card className="border-l-4 border-l-red-500 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-red-50/30 overflow-hidden group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent mb-1">
                {activeCount}
              </div>
              <div className="text-sm font-semibold text-gray-700">Active Emergencies</div>
              <div className="text-xs text-gray-500 mt-1">Requires immediate attention</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-red-100 to-red-200 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
              <AlertTriangle className="h-7 w-7 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acknowledged Card */}
      <Card className="border-l-4 border-l-blue-500 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-blue-50/30 overflow-hidden group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent mb-1">
                {acknowledgedCount}
              </div>
              <div className="text-sm font-semibold text-gray-700">Acknowledged</div>
              <div className="text-xs text-gray-500 mt-1">In progress</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
              <Clock className="h-7 w-7 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resolved Today Card */}
      <Card className="border-l-4 border-l-green-500 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-green-50/30 overflow-hidden group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent mb-1">
                {resolvedToday}
              </div>
              <div className="text-sm font-semibold text-gray-700">Resolved Today</div>
              <div className="text-xs text-gray-500 mt-1">Successfully handled</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-100 to-green-200 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
              <History className="h-7 w-7 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Handled Card */}
      <Card className="border-l-4 border-l-purple-500 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-purple-50/30 overflow-hidden group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent mb-1">
                {historyRequests.length}
              </div>
              <div className="text-sm font-semibold text-gray-700">Total Handled</div>
              <div className="text-xs text-gray-500 mt-1">All time records</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
              <Building2 className="h-7 w-7 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface SOSRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  user_address: string | null;
  latitude: number;
  longitude: number;
  emergency_type: string;
  description: string | null;
  assigned_hospital_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  estimated_arrival: string | null;
  notes: string | null;
  status: string;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string;
  user_type: string;
}

const HospitalDashboard: React.FC = () => {
  const [sosRequests, setSosRequests] = useState<SOSRequest[]>([]);
  const [historyRequests, setHistoryRequests] = useState<SOSRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [hospitalLocation, setHospitalLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const navigate = useNavigate();
  const subscriptionRef = useRef<any>(null);

  // Fetch hospital id for the logged-in user and profile
  useEffect(() => {
    const fetchHospitalIdAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch hospital id and location
        const { data: hospital, error: hospitalError } = await supabase
          .from('hospital_profiles')
          .select('id, latitude, longitude')
          .eq('id', user.id)
          .single();
        if (hospital) {
          setHospitalId(hospital.id);
          if (hospital.latitude && hospital.longitude) {
            setHospitalLocation({
              lat: Number(hospital.latitude),
              lng: Number(hospital.longitude)
            });
          }
        } else {
          toast({
            title: 'Profile Not Found',
            description: 'No hospital profile found for this account.',
            variant: 'destructive',
          });
          navigate('/auth/hospital');
        }
        // Fetch profile
        const { data: prof, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (prof) {
          setProfile(prof as Profile);
        }
        setProfileLoading(false);
      }
    };
    fetchHospitalIdAndProfile();
    // eslint-disable-next-line
  }, []);

  // Fetch and subscribe to ALL sos_requests (not filtered by hospital)
  useEffect(() => {
    setLoading(true);

    const fetchSOSRequests = async () => {
      if (!hospitalId) {
        setLoading(false);
        return;
      }

      // Fetch only SOS requests assigned to this hospital
      const { data, error } = await supabase
        .from('sos_requests')
        .select('*')
        .eq('assigned_hospital_id', hospitalId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Separate active and history
        const active = data.filter(r => r.status !== 'resolved' && r.status !== 'dismissed');
        const history = data.filter(r => r.status === 'resolved' || r.status === 'dismissed');
        setSosRequests(active);
        setHistoryRequests(history);
      }
      setLoading(false);
    };

    fetchSOSRequests();

    // Clean up previous subscription if any
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Real-time subscription (listen to all sos_requests)
    const channel = supabase
      .channel('realtime:sos_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sos_requests',
        },
        (payload) => {
          const newRequest = payload.new as SOSRequest;
          const isAssigned = newRequest.assigned_hospital_id === hospitalId;
          
          if (!isAssigned && payload.eventType === 'INSERT') return;
          
          setSosRequests((prev) => {
            let updated = prev;
            if (payload.eventType === 'INSERT' && isAssigned) {
              if (newRequest.status !== 'resolved' && newRequest.status !== 'dismissed') {
                if (!prev.some((req) => req.id === newRequest.id)) {
                  updated = [newRequest, ...prev];
                }
              }
            } else if (payload.eventType === 'UPDATE' && isAssigned) {
              const isResolved = newRequest.status === 'resolved' || newRequest.status === 'dismissed';
              if (isResolved) {
                // Move to history
                updated = prev.filter((req) => req.id !== newRequest.id);
              } else {
                updated = prev.map((req) =>
                  req.id === newRequest.id ? newRequest : req
                );
              }
            } else if (payload.eventType === 'DELETE') {
              updated = prev.filter((req) => req.id !== payload.old.id);
            }
            return updated;
          });
          setHistoryRequests((prev) => {
            let updated = prev;
            if (payload.eventType === 'INSERT' && isAssigned) {
              if (newRequest.status === 'resolved' || newRequest.status === 'dismissed') {
                if (!prev.some((req) => req.id === newRequest.id)) {
                  updated = [newRequest, ...prev];
                }
              }
            } else if (payload.eventType === 'UPDATE' && isAssigned) {
              const isResolved = newRequest.status === 'resolved' || newRequest.status === 'dismissed';
              if (isResolved) {
                updated = prev.map((req) =>
                  req.id === newRequest.id ? newRequest : req
                );
                if (!prev.some((req) => req.id === newRequest.id)) {
                  updated = [newRequest, ...prev];
                }
              } else {
                updated = prev.filter((req) => req.id !== newRequest.id);
              }
            } else if (payload.eventType === 'DELETE') {
              updated = prev.filter((req) => req.id !== payload.old.id);
            }
            return updated;
          });
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [hospitalId, toast]);

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'acknowledged': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Immediate UI update on status change (optimistic)
  const handleStatusUpdate = async (id: string, status: string) => {
    const request = sosRequests.find((req) => req.id === id);
    
    // Optimistic update
    setSosRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status } : req))
    );
    
    // Move to history if resolved or dismissed
    if (status === 'resolved' || status === 'dismissed') {
      if (request) {
        setHistoryRequests((prev) => [request, ...prev]);
      }
      // Remove from active list after a delay
      setTimeout(() => {
        setSosRequests((prev) => 
          prev.filter((req) => req.id !== id)
        );
      }, 500);
    }
    
    const { error } = await supabase
      .from('sos_requests')
      .update({ status })
      .eq('id', id);

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
        'acknowledged': 'Request acknowledged. Team will respond shortly.',
        'resolved': 'Request resolved successfully.',
        'dismissed': 'Request dismissed.',
        'pending': 'Request status updated.',
      };
      toast({
        title: 'Status Updated',
        description: statusMessages[status] || `Request marked as ${status}.`,
      });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth/hospital');
  };

  const handleProfileUpdate = async (updated: any) => {
    if (!profile) return;
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: updated.first_name,
        last_name: updated.last_name,
        phone: updated.phone,
      })
      .eq('id', profile.id);
    if (!error) {
      setProfile({ ...profile, ...updated });
      toast({ title: "Profile Updated", description: "Your profile has been updated." });
    } else {
      toast({ title: "Error", description: "Could not update profile.", variant: "destructive" });
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      {/* Professional Header - Matching UserDashboard Style */}
      <header className="bg-white shadow-md border-b sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Brand Section - Left Side */}
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-sm">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Hospital Dashboard
                </span>
                {profile && (
                  <span className="text-xs sm:text-sm text-gray-600 hidden sm:flex items-center gap-1 mt-0.5">
                    <User className="h-3 w-3" />
                    {profile.first_name} {profile.last_name} • Hospital Staff
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons - Right Side - Professional Layout */}
            <div className="flex items-center space-x-2 flex-wrap justify-end">
              {/* Profile Button */}
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

              {/* Blood Connect Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/hospital/bloodconnect')}
                className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200 hover:from-red-100 hover:to-pink-100 text-red-700 hover:text-red-800 hidden sm:flex items-center gap-2 transition-all duration-200 shadow-sm"
              >
                <Heart className="h-4 w-4" />
                <span>Blood Connect</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/hospital/bloodconnect')}
                className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200 hover:from-red-100 hover:to-pink-100 text-red-700 sm:hidden p-2"
                title="Blood Connect"
              >
                <Heart className="h-4 w-4" />
              </Button>

              {/* Message/Chat Button - Properly Positioned */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/hospital/bloodconnect/chat')}
                className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 hover:from-blue-100 hover:to-cyan-100 text-blue-700 hover:text-blue-800 hidden sm:flex items-center gap-2 transition-all duration-200 shadow-sm relative"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Chat</span>
                {/* Optional: Notification Badge */}
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-pulse"></span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/hospital/bloodconnect/chat')}
                className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 hover:from-blue-100 hover:to-cyan-100 text-blue-700 sm:hidden p-2 relative"
                title="Chat"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-blue-500 rounded-full animate-pulse"></span>
              </Button>

              {/* Logout Button */}
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

          {/* Status Bar - Enhanced Design */}
          <div className="pb-4 border-t border-gray-100 pt-3">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <Badge 
                variant="default" 
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm px-3 py-1"
              >
                <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                HOSPITAL ACTIVE
              </Badge>
              
              <Badge 
                variant="outline" 
                className="text-green-700 border-green-300 bg-green-50/50 hover:bg-green-50 px-3 py-1"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                <span className="hidden sm:inline">System Online</span>
                <span className="sm:hidden">Online</span>
              </Badge>
              
              <Badge 
                variant="outline" 
                className="text-blue-700 border-blue-300 bg-blue-50/50 hover:bg-blue-50 px-3 py-1"
              >
                <AlertTriangle className="h-3 w-3 mr-1.5" />
                <span className="hidden sm:inline">{sosRequests.filter(r => r.status === 'active' || r.status === 'pending').length} Active Emergencies</span>
                <span className="sm:hidden">{sosRequests.filter(r => r.status === 'active' || r.status === 'pending').length} Active</span>
              </Badge>
              
              <Badge 
                variant="outline" 
                className="text-amber-700 border-amber-300 bg-amber-50/50 hover:bg-amber-50 px-3 py-1"
              >
                <Clock className="h-3 w-3 mr-1.5" />
                <span className="hidden sm:inline">{sosRequests.filter(r => r.status === 'acknowledged').length} Acknowledged</span>
                <span className="sm:hidden">{sosRequests.filter(r => r.status === 'acknowledged').length} Ack</span>
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Tabs defaultValue="emergency" className="space-y-6 w-full">
          {/* Enhanced Tabs Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
            <TabsList className="grid w-full grid-cols-3 h-auto bg-transparent gap-1">
              <TabsTrigger 
                value="emergency" 
                className="text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 rounded-lg"
              >
                <AlertTriangle className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Emergency Requests</span>
                <span className="sm:hidden">Emergency</span>
                {sosRequests.length > 0 && (
                  <Badge className="ml-2 bg-red-600 text-white text-[10px] px-1.5 py-0">
                    {sosRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="map" 
                className="text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 rounded-lg"
              >
                <MapPin className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Map View</span>
                <span className="sm:hidden">Map</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 rounded-lg"
              >
                <History className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Response History</span>
                <span className="sm:hidden">History</span>
                {historyRequests.length > 0 && (
                  <Badge className="ml-2 bg-green-600 text-white text-[10px] px-1.5 py-0">
                    {historyRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="emergency" className="space-y-6 mt-6">
            {/* Stats Cards - Enhanced */}
            <HospitalStatsCards sosRequests={sosRequests} historyRequests={historyRequests} />
            
            {/* AI Priority Suggestions - Enhanced */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 shadow-sm">
              <AIPrioritySuggestor sosRequests={sosRequests} />
            </div>

            {/* Enhanced Emergency Requests Section */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-t-lg border-b border-red-100">
                <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-md">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">Emergency Requests</CardTitle>
                      <p className="text-sm text-gray-600 mt-1 font-medium">Active SOS requests assigned to your hospital</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 font-semibold px-3 py-1">
                      {sosRequests.length} Active
                    </Badge>
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 font-semibold px-3 py-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                      Live
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="px-4 sm:px-6 py-6">
                <div className="space-y-4">
                  {sosRequests.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <AlertTriangle className="h-10 w-10 text-green-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">All Clear</h3>
                      <p className="text-gray-600 text-sm max-w-sm mx-auto">
                        No emergency requests assigned to your hospital at the moment. Great job!
                      </p>
                    </div>
                  ) : (
                    sosRequests.map((request) => (
                      <Card 
                        key={request.id} 
                        className={`border-l-4 hover:shadow-xl transition-all duration-300 bg-white rounded-lg overflow-hidden ${
                          request.status === 'active' ? 'border-l-red-500 shadow-red-50' :
                          request.status === 'pending' ? 'border-l-yellow-500 shadow-yellow-50' :
                          request.status === 'acknowledged' ? 'border-l-blue-500 shadow-blue-50' :
                          'border-l-gray-500'
                        }`}
                      >
                        <CardContent className="p-5 sm:p-6 bg-gradient-to-br from-white to-gray-50/50">
                          <div className="flex flex-col space-y-4">
                            <div className="flex flex-col space-y-4 lg:flex-row lg:items-start lg:justify-between lg:space-y-0">
                              {/* Request Information */}
                              <div className="flex items-start space-x-4 flex-1 min-w-0">
                              <div className="flex-shrink-0 p-2.5 bg-gradient-to-br from-red-100 to-red-200 rounded-lg shadow-sm">
                                <User className="h-5 w-5 text-red-600" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                {/* Badge Row */}
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                  <Badge className={`${getStatusColor(request.status)} text-xs font-medium px-2 py-0.5`}>
                                    {request.status.toUpperCase()}
                                  </Badge>
                                  <Badge variant="outline" className="text-blue-600 border-blue-200 text-xs px-2 py-0.5">
                                    {request.emergency_type.toUpperCase()}
                                  </Badge>
                                  <Badge variant="outline" className="text-gray-600 border-gray-200 text-xs px-2 py-0.5">
                                    ID: {request.user_id.slice(0, 8)}...
                                  </Badge>
                                  <div className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatTime(request.created_at)}</span>
                                  </div>
                                </div>

                                {/* Location and Details */}
                                <div className="space-y-2">
                                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                                    {request.user_address || 'Emergency Location'}
                                  </h3>
                                  
                                  <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                                    <MapPin className="h-4 w-4" />
                                    <span>
                                      {request.latitude?.toFixed(6)}, {request.longitude?.toFixed(6)}
                                    </span>
                                    <a
                                      href={`https://www.google.com/maps?q=${request.latitude},${request.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition ml-2"
                                      title="Open in Maps"
                                    >
                                      <Navigation className="h-3 w-3" />
                                    </a>
                                  </div>
                                  
                                  {request.notes && (
                                    <p className="text-sm text-gray-700 break-words">
                                      <span className="font-medium">Notes: </span>
                                      {request.notes}
                                    </p>
                                  )}
                                  
                                  {request.estimated_arrival && (
                                    <p className="text-sm text-gray-700">
                                      <span className="font-medium">ETA: </span>
                                      {request.estimated_arrival}
                                    </p>
                                  )}
                                  
                                  {/* Patient Contact Info */}
                                  <div className="flex flex-wrap gap-2 pt-2">
                                    {request.user_name && (
                                      <div className="flex items-center gap-1 text-xs text-gray-600">
                                        <User className="h-3 w-3" />
                                        <span>{request.user_name}</span>
                                      </div>
                                    )}
                                    {request.user_phone && (
                                      <a 
                                        href={`tel:${request.user_phone}`}
                                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                      >
                                        <Phone className="h-3 w-3" />
                                        {request.user_phone}
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                              {/* Action Buttons - Enhanced */}
                              <div className="flex flex-col space-y-2 lg:w-44 lg:flex-shrink-0">
                              {request.status === 'active' || request.status === 'pending' ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusUpdate(request.id, 'acknowledged')}
                                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white w-full shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
                                >
                                  <Clock className="h-4 w-4 mr-2" />
                                  Acknowledge
                                </Button>
                              ) : null}
                              {request.status === 'acknowledged' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusUpdate(request.id, 'resolved')}
                                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white w-full shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
                                >
                                  <History className="h-4 w-4 mr-2" />
                                  Resolve
                                </Button>
                              )}
                              {(request.status === 'active' || request.status === 'pending' || request.status === 'acknowledged') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusUpdate(request.id, 'dismissed')}
                                  className="w-full border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                                >
                                  Dismiss
                                </Button>
                              )}
                              </div>
                            </div>

                            {/* AI Smart Triage */}
                            <div className="w-full pt-2 border-t">
                              <AISmartTriage request={request} />
                            </div>

                            {/* Medical Report Toggle - Full Width Below Actions */}
                            <div className="w-full pt-2 border-t">
                              <MedicalReportView 
                                userId={request.user_id} 
                                userName={request.user_name || 'Patient'}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map" className="space-y-6 mt-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-t-lg border-b border-blue-100">
                <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">Emergency Map</CardTitle>
                      <p className="text-sm text-gray-600 mt-1 font-medium">Visual overview of all assigned SOS requests</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 font-semibold px-3 py-1">
                    {sosRequests.length} Assigned
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-6 pt-6">
                <div className="h-[500px] sm:h-[600px] w-full rounded-xl overflow-hidden border-2 border-gray-200 shadow-inner">
                  <HospitalMap 
                    sosRequests={sosRequests.filter(r => 
                      r.status !== 'resolved' && r.status !== 'dismissed'
                    )} 
                    hospitalLocation={hospitalLocation || undefined}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6 mt-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg border-b border-green-100">
                <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md">
                      <History className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">Response History</CardTitle>
                      <p className="text-sm text-gray-600 mt-1 font-medium">Previously handled emergency requests</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 font-semibold px-3 py-1">
                    {historyRequests.length} Completed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 py-6">
                <div className="space-y-4">
                  {historyRequests.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <History className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">No History Yet</h3>
                      <p className="text-gray-600 text-sm max-w-sm mx-auto">
                        Resolved and dismissed requests will appear here.
                      </p>
                    </div>
                  ) : (
                    historyRequests.map((request) => (
                      <div key={request.id} className="border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50/50">
                        <div className="flex flex-col space-y-3">
                          <div className="flex flex-col space-y-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                            <div className="flex items-start space-x-3 flex-1 min-w-0">
                              <div className="flex-shrink-0">
                                <User className="h-4 w-4 text-gray-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <Badge className={`${getStatusColor(request.status)} text-xs`}>
                                    {request.status.toUpperCase()}
                                  </Badge>
                                  <Badge variant="outline" className="text-blue-600 text-xs">
                                    ID: {request.user_id.slice(0, 8)}...
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {formatTime(request.created_at)}
                                  </span>
                                </div>
                                <p className="font-semibold text-sm sm:text-base truncate">
                                  {request.user_address || 'Emergency Location'}
                                </p>
                                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600 mb-2">
                                  <MapPin className="h-3 w-3" />
                                  <span>
                                    {request.latitude?.toFixed(6)}, {request.longitude?.toFixed(6)}
                                  </span>
                                </div>
                                {request.user_name && (
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <User className="h-3 w-3" />
                                    <span>{request.user_name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Medical Report in History */}
                          <div className="w-full pt-2 border-t">
                            <MedicalReportView 
                              userId={request.user_id} 
                              userName={request.user_name || 'Patient'}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ProfileModal
        open={showProfile}
        onClose={() => setShowProfile(false)}
        profile={profile}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  );
};

export default HospitalDashboard;
