import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Droplet, Plus, Package, AlertTriangle, CheckCircle2, Clock, MessageCircle, Users, Inbox, X, Heart, TrendingUp, User, Phone, Mail, Eye } from 'lucide-react';
import BloodRequestList from '@/components/BloodRequestList';
import BloodDonorList from '@/components/BloodDonorList';
import HospitalRequestsManager from '@/components/HospitalRequestsManager';

interface BloodInventory {
  id: string;
  hospital_id: string;
  blood_group: string;
  units_available: number;
  units_reserved: number;
  last_updated: string;
  expiry_dates: string[] | null;
}

interface HospitalBloodRequest {
  id: string;
  hospital_id: string;
  blood_group: string;
  units_required: number;
  units_received: number;
  urgency_level: string;
  status: string;
  accepted_by: string | null;
  accepted_at: string | null;
  user_response: string | null;
  created_at: string;
  accepted_user?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
  };
}

const HospitalBloodConnect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [inventory, setInventory] = useState<BloodInventory[]>([]);
  const [requests, setRequests] = useState<HospitalBloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAcceptedRequest, setSelectedAcceptedRequest] = useState<HospitalBloodRequest | null>(null);
  const [showUserDetailsDialog, setShowUserDetailsDialog] = useState(false);
  const [formData, setFormData] = useState({
    blood_group: '',
    units_available: 0,
    units_reserved: 0,
  });
  const [requestFormData, setRequestFormData] = useState({
    blood_group: '',
    units_required: 1,
    urgency_level: 'normal' as 'normal' | 'urgent' | 'critical',
  });

  useEffect(() => {
    if (user) {
      fetchInventory();
      fetchHospitalRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchInventory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('hospital_blood_inventory' as never)
        .select('*')
        .eq('hospital_id', user.id)
        .order('blood_group', { ascending: true }) as unknown as { data: BloodInventory[] | null; error: { message: string } | null });

      if (error) throw error;
      setInventory(data || []);
    } catch (error: unknown) {
      console.error('Error fetching inventory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch inventory';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHospitalRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase
        .from('hospital_blood_requests' as never)
        .select('*')
        .eq('hospital_id', user.id)
        .order('created_at', { ascending: false }) as unknown as { 
          data: Array<Record<string, unknown>> | null; 
          error: { message: string } | null 
        });

      if (error) throw error;
      
      // Fetch user profiles for accepted requests
      const acceptedUserIds = (data || [])
        .filter((req: Record<string, unknown>) => req.accepted_by)
        .map((req: Record<string, unknown>) => req.accepted_by as string);
      
      const userProfilesMap = new Map<string, { id: string; first_name: string | null; last_name: string | null; phone: string | null; email: string | null }>();
      
      if (acceptedUserIds.length > 0) {
        const { data: profilesData } = await (supabase
          .from('profiles' as never)
          .select('id, first_name, last_name, phone, email')
          .in('id', acceptedUserIds) as unknown as { 
            data: Array<{ id: string; first_name: string | null; last_name: string | null; phone: string | null; email: string | null }> | null;
          });
        
        if (profilesData) {
          profilesData.forEach(profile => {
            userProfilesMap.set(profile.id, profile);
          });
        }
      }
      
      const requestsWithUser = (data || []).map((req: Record<string, unknown>) => {
        const acceptedById = req.accepted_by as string | null;
        const acceptedUser = acceptedById ? userProfilesMap.get(acceptedById) : undefined;
        
        return {
          ...req,
          accepted_user: acceptedUser
        };
      }) as HospitalBloodRequest[];
      
      setRequests(requestsWithUser);
    } catch (error: unknown) {
      console.error('Error fetching requests:', error);
    }
  };

  const updateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.blood_group || formData.units_available < 0) return;

    try {
      const { error } = await (supabase
        .from('hospital_blood_inventory' as never)
        .upsert({
          hospital_id: user.id,
          blood_group: formData.blood_group,
          units_available: formData.units_available,
          units_reserved: formData.units_reserved || 0,
        } as never, {
          onConflict: 'hospital_id,blood_group'
        }) as unknown as { error: { message: string } | null });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Inventory updated successfully',
      });

      setFormData({ blood_group: '', units_available: 0, units_reserved: 0 });
      fetchInventory();
    } catch (error: unknown) {
      console.error('Error updating inventory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update inventory';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const createHospitalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !requestFormData.blood_group || requestFormData.units_required < 1) return;

    try {
      const { error } = await (supabase
        .from('hospital_blood_requests' as never)
        .insert({
          hospital_id: user.id,
          blood_group: requestFormData.blood_group,
          units_required: requestFormData.units_required,
          urgency_level: requestFormData.urgency_level,
          status: 'active',
        } as never) as unknown as { error: { message: string } | null });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Blood request created successfully',
      });

      setRequestFormData({ blood_group: '', units_required: 1, urgency_level: 'normal' });
      fetchHospitalRequests();
    } catch (error: unknown) {
      console.error('Error creating request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create request';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const cancelHospitalRequest = async (requestId: string) => {
    if (!user) return;

    try {
      const { error } = await (supabase
        .from('hospital_blood_requests' as never)
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.id,
        } as never)
        .eq('id', requestId)
        .eq('hospital_id', user.id) as unknown as { error: { message: string } | null });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Request cancelled successfully',
      });

      fetchHospitalRequests();
    } catch (error: unknown) {
      console.error('Error cancelling request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel request';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const completeHospitalRequest = async (requestId: string) => {
    if (!user) return;

    try {
      const { error } = await (supabase
        .from('hospital_blood_requests' as never)
        .update({
          status: 'fulfilled',
        } as never)
        .eq('id', requestId)
        .eq('hospital_id', user.id) as unknown as { error: { message: string } | null });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Request marked as completed',
      });

      fetchHospitalRequests();
    } catch (error: unknown) {
      console.error('Error completing request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete request';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const getInventoryStats = () => {
    const total = inventory.reduce((sum, item) => sum + item.units_available, 0);
    const reserved = inventory.reduce((sum, item) => sum + item.units_reserved, 0);
    const available = total - reserved;
    const lowStock = inventory.filter(item => item.units_available < 10).length;

    return { total, reserved, available, lowStock };
  };

  const stats = getInventoryStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="relative">
                  <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
                  <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-1.5">
                    <Droplet className="h-4 w-4 text-white" fill="currentColor" />
                  </div>
                </div>
                <span>Hospital Blood Management</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Efficiently manage your blood bank inventory and coordinate with donors
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate('/dashboard/hospital/bloodconnect/chat')}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                size="sm"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Messages</span>
                <span className="sm:hidden">Chat</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-xl hover:shadow-2xl transition-all transform hover:scale-105">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-100 font-medium mb-1">Total Units</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                  <p className="text-xs text-blue-100 mt-1">All blood groups</p>
                </div>
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                  <Package className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none shadow-xl hover:shadow-2xl transition-all transform hover:scale-105">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-100 font-medium mb-1">Available</p>
                  <p className="text-3xl font-bold">{stats.available}</p>
                  <p className="text-xs text-green-100 mt-1">Ready to use</p>
                </div>
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-none shadow-xl hover:shadow-2xl transition-all transform hover:scale-105">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-100 font-medium mb-1">Reserved</p>
                  <p className="text-3xl font-bold">{stats.reserved}</p>
                  <p className="text-xs text-amber-100 mt-1">Pending requests</p>
                </div>
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                  <Clock className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white border-none shadow-xl hover:shadow-2xl transition-all transform hover:scale-105">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-100 font-medium mb-1">Low Stock</p>
                  <p className="text-3xl font-bold">{stats.lowStock}</p>
                  <p className="text-xs text-red-100 mt-1">Needs attention</p>
                </div>
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                  <AlertTriangle className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Card className="border-none shadow-xl bg-card/95 backdrop-blur">
          <Tabs defaultValue="inventory" className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-auto p-2 bg-muted/50 rounded-lg">
              <TabsTrigger 
                value="inventory"
                className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-blue-600 transition-all font-medium"
              >
                <Package className="h-5 w-5" />
                <span className="text-sm">Inventory</span>
              </TabsTrigger>
              <TabsTrigger 
                value="create-request"
                className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-red-600 transition-all font-medium"
              >
                <Plus className="h-5 w-5" />
                <span className="text-sm">Create Request</span>
              </TabsTrigger>
              <TabsTrigger 
                value="donors"
                className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-green-600 transition-all font-medium"
              >
                <Users className="h-5 w-5" />
                <span className="text-sm">Find Donors</span>
              </TabsTrigger>
              <TabsTrigger 
                value="user-requests"
                className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-blue-600 transition-all font-medium"
              >
                <Inbox className="h-5 w-5" />
                <span className="text-sm">User Requests</span>
              </TabsTrigger>
              <TabsTrigger 
                value="all-requests"
                className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-rose-600 transition-all font-medium"
              >
                <Droplet className="h-5 w-5" />
                <span className="text-sm">All Requests</span>
              </TabsTrigger>
            </TabsList>

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="mt-6 space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-2 border-blue-200 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <Package className="h-5 w-5" />
                      Update Inventory
                    </CardTitle>
                    <CardDescription>Add or update blood inventory for your hospital</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={updateInventory} className="space-y-4">
                      <div>
                        <Label htmlFor="blood_group" className="text-sm font-semibold">Blood Group *</Label>
                        <Select
                          value={formData.blood_group}
                          onValueChange={(value) => setFormData({ ...formData, blood_group: value })}
                          required
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select blood group" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A+">A+</SelectItem>
                            <SelectItem value="A-">A-</SelectItem>
                            <SelectItem value="B+">B+</SelectItem>
                            <SelectItem value="B-">B-</SelectItem>
                            <SelectItem value="AB+">AB+</SelectItem>
                            <SelectItem value="AB-">AB-</SelectItem>
                            <SelectItem value="O+">O+</SelectItem>
                            <SelectItem value="O-">O-</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="units_available" className="text-sm font-semibold">Units Available *</Label>
                        <Input
                          id="units_available"
                          type="number"
                          min="0"
                          value={formData.units_available}
                          onChange={(e) => setFormData({ ...formData, units_available: parseInt(e.target.value) || 0 })}
                          className="mt-2"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="units_reserved" className="text-sm font-semibold">Units Reserved</Label>
                        <Input
                          id="units_reserved"
                          type="number"
                          min="0"
                          value={formData.units_reserved}
                          onChange={(e) => setFormData({ ...formData, units_reserved: parseInt(e.target.value) || 0 })}
                          className="mt-2"
                        />
                      </div>

                      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all mt-4">
                        <Package className="h-4 w-4 mr-2" />
                        Update Inventory
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-200 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <TrendingUp className="h-5 w-5" />
                      Current Inventory
                    </CardTitle>
                    <CardDescription>View and manage your current blood stock</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {loading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-sm text-muted-foreground">Loading inventory...</p>
                      </div>
                    ) : inventory.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground font-medium">No inventory records</p>
                        <p className="text-sm text-muted-foreground mt-1">Start by adding your first blood group</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {inventory.map((item) => {
                          const available = item.units_available - (item.units_reserved || 0);
                          const stockStatus = available < 10 ? 'critical' : available < 20 ? 'warning' : 'good';
                          return (
                            <div key={item.id} className="border-2 rounded-lg p-4 hover:shadow-md transition-all bg-white">
                              <div className="flex items-center justify-between mb-3">
                                <Badge className={`text-base px-4 py-1.5 ${
                                  stockStatus === 'critical' ? 'bg-red-600 text-white' :
                                  stockStatus === 'warning' ? 'bg-orange-500 text-white' :
                                  'bg-green-600 text-white'
                                }`}>
                                  {item.blood_group}
                                </Badge>
                                <span className={`text-lg font-bold ${
                                  stockStatus === 'critical' ? 'text-red-600' : 
                                  stockStatus === 'warning' ? 'text-orange-600' : 
                                  'text-green-600'
                                }`}>
                                  {available} available
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                <div>
                                  <span className="text-muted-foreground">Total: </span>
                                  <span className="font-semibold">{item.units_available} units</span>
                                </div>
                                {item.units_reserved > 0 && (
                                  <div>
                                    <span className="text-muted-foreground">Reserved: </span>
                                    <span className="font-semibold text-amber-600">{item.units_reserved} units</span>
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                                onClick={() => setFormData({
                                  blood_group: item.blood_group,
                                  units_available: item.units_available,
                                  units_reserved: item.units_reserved || 0,
                                })}
                              >
                                <Package className="h-4 w-4 mr-2" />
                                Quick Update
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Create Request Tab */}
            <TabsContent value="create-request" className="mt-6 space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-2 border-red-200 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 border-b">
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <Plus className="h-5 w-5" />
                      Create Blood Request
                    </CardTitle>
                    <CardDescription>Request blood from available donors in the community</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={createHospitalRequest} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="request_blood_group" className="text-sm font-semibold">Blood Group *</Label>
                          <Select
                            value={requestFormData.blood_group}
                            onValueChange={(value) => setRequestFormData({ ...requestFormData, blood_group: value })}
                            required
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select blood group" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A+">A+</SelectItem>
                              <SelectItem value="A-">A-</SelectItem>
                              <SelectItem value="B+">B+</SelectItem>
                              <SelectItem value="B-">B-</SelectItem>
                              <SelectItem value="AB+">AB+</SelectItem>
                              <SelectItem value="AB-">AB-</SelectItem>
                              <SelectItem value="O+">O+</SelectItem>
                              <SelectItem value="O-">O-</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="request_units_required" className="text-sm font-semibold">Units Required *</Label>
                          <Input
                            id="request_units_required"
                            type="number"
                            min="1"
                            value={requestFormData.units_required}
                            onChange={(e) => setRequestFormData({ ...requestFormData, units_required: parseInt(e.target.value) || 1 })}
                            className="mt-2"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="request_urgency_level" className="text-sm font-semibold">Urgency Level *</Label>
                        <Select
                          value={requestFormData.urgency_level}
                          onValueChange={(value: 'normal' | 'urgent' | 'critical') => 
                            setRequestFormData({ ...requestFormData, urgency_level: value })
                          }
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all mt-4">
                        <Heart className="h-4 w-4 mr-2" />
                        Create Request
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="border-2 border-amber-200 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                    <CardTitle className="flex items-center gap-2 text-amber-700">
                      <Clock className="h-5 w-5" />
                      My Hospital Requests
                    </CardTitle>
                    <CardDescription>Track and manage your blood requests</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {requests.length === 0 ? (
                      <div className="text-center py-12">
                        <Droplet className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground font-medium">No requests created yet</p>
                        <p className="text-sm text-muted-foreground mt-1">Create your first blood request to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {requests.map((request) => (
                          <div key={request.id} className="border-2 rounded-lg p-4 hover:shadow-md transition-all bg-white">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <Badge className="bg-red-600 text-white text-base px-3 py-1">
                                    {request.blood_group}
                                  </Badge>
                                  <Badge variant={request.urgency_level === 'critical' ? 'destructive' : request.urgency_level === 'urgent' ? 'default' : 'outline'}>
                                    {request.urgency_level}
                                  </Badge>
                                  <Badge variant={request.status === 'active' ? 'default' : 'secondary'}>
                                    {request.status}
                                  </Badge>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-gray-700">
                                    {request.units_required} units required
                                    {request.units_received > 0 && (
                                      <span className="text-green-600 ml-2 font-semibold">
                                        • {request.units_received} received
                                      </span>
                                    )}
                                  </p>
                                  {request.accepted_by && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Accepted by a donor
                                      </p>
                                      {request.accepted_at && (
                                        <span className="text-xs text-muted-foreground">
                                          on {new Date(request.accepted_at).toLocaleString()}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {request.user_response && (
                                    <p className="text-sm text-blue-600 italic">
                                      "{request.user_response}"
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    Created {new Date(request.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-3 flex-wrap">
                                {request.status === 'active' && !request.accepted_by && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                    onClick={() => cancelHospitalRequest(request.id)}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                )}
                                {request.accepted_by && request.status !== 'fulfilled' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                      onClick={() => {
                                        setSelectedAcceptedRequest(request);
                                        setShowUserDetailsDialog(true);
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      View Details
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-blue-600 hover:bg-blue-700 text-white"
                                      onClick={() => navigate(`/dashboard/hospital/bloodconnect/chat?hospitalRequestId=${request.id}&userId=${request.accepted_by}`)}
                                    >
                                      <MessageCircle className="h-4 w-4 mr-1" />
                                      Chat
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-green-600 border-green-300 hover:bg-green-50"
                                      onClick={() => completeHospitalRequest(request.id)}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Complete
                                    </Button>
                                  </>
                                )}
                                {request.status === 'fulfilled' && (
                                  <Badge className="bg-green-600 text-white">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Completed
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Find Donors Tab */}
            <TabsContent value="donors" className="mt-6 space-y-4">
              <Card className="border-2 border-green-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <Users className="h-5 w-5" />
                    Find Available Donors
                  </CardTitle>
                  <CardDescription>Browse and connect with registered blood donors</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <BloodDonorList />
                </CardContent>
              </Card>
            </TabsContent>

            {/* User Requests Tab */}
            <TabsContent value="user-requests" className="mt-6 space-y-4">
              <Card className="border-2 border-blue-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-blue-700">
                        <Inbox className="h-5 w-5" />
                        User Blood Requests
                      </CardTitle>
                      <CardDescription>Review and respond to blood requests from users. Approve or reject requests based on availability.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <HospitalRequestsManager />
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Requests Tab */}
            <TabsContent value="all-requests" className="mt-6 space-y-4">
              <Card className="border-2 border-rose-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-rose-50 to-pink-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-rose-700">
                    <Droplet className="h-5 w-5" />
                    All Blood Requests
                  </CardTitle>
                  <CardDescription>View all active blood requests in the system</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <BloodRequestList />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* User Details Dialog */}
      <Dialog open={showUserDetailsDialog} onOpenChange={setShowUserDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Donor Details
            </DialogTitle>
            <DialogDescription>
              Information about the donor who accepted your blood request
            </DialogDescription>
          </DialogHeader>
          {selectedAcceptedRequest?.accepted_user ? (
            <div className="mt-4 space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-4 border-b">
                      <div className="p-3 bg-blue-100 rounded-full">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {selectedAcceptedRequest.accepted_user.first_name || ''} {selectedAcceptedRequest.accepted_user.last_name || ''}
                        </h3>
                        <p className="text-sm text-muted-foreground">Blood Donor</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {selectedAcceptedRequest.accepted_user.phone && (
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          <Phone className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <a 
                              href={`tel:${selectedAcceptedRequest.accepted_user.phone}`}
                              className="text-sm font-medium hover:text-blue-600"
                            >
                              {selectedAcceptedRequest.accepted_user.phone}
                            </a>
                          </div>
                        </div>
                      )}

                      {selectedAcceptedRequest.accepted_user.email && (
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          <Mail className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <a 
                              href={`mailto:${selectedAcceptedRequest.accepted_user.email}`}
                              className="text-sm font-medium hover:text-blue-600 break-all"
                            >
                              {selectedAcceptedRequest.accepted_user.email}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedAcceptedRequest.user_response && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-900 mb-2">Donor's Message:</p>
                        <p className="text-sm text-blue-800 italic">"{selectedAcceptedRequest.user_response}"</p>
                      </div>
                    )}

                    {selectedAcceptedRequest.accepted_at && (
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        Accepted on: {new Date(selectedAcceptedRequest.accepted_at).toLocaleString()}
                      </div>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => {
                          setShowUserDetailsDialog(false);
                          navigate(`/dashboard/hospital/bloodconnect/chat?hospitalRequestId=${selectedAcceptedRequest.id}&userId=${selectedAcceptedRequest.accepted_by}`);
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Start Chat
                      </Button>
                      {selectedAcceptedRequest.accepted_user.phone && (
                        <Button
                          variant="outline"
                          onClick={() => window.open(`tel:${selectedAcceptedRequest.accepted_user?.phone}`, '_blank')}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="mt-4 text-center py-8">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Loading donor details...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HospitalBloodConnect;
