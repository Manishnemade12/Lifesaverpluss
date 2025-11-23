import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BloodDonorRegistration from '@/components/BloodDonorRegistration';
import BloodRequestForm from '@/components/BloodRequestForm';
import BloodRequestList from '@/components/BloodRequestList';
import BloodDonorList from '@/components/BloodDonorList';
import HospitalList from '@/components/HospitalList';
import { 
  Heart, 
  Droplet, 
  List, 
  Users, 
  Plus, 
  MessageCircle, 
  Sparkles,
  Shield,
  UserCircle,
  Building2,
  MapPin,
  Phone,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useBloodDonor } from '@/hooks/useBloodDonor';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface BloodRequest {
  id: string;
  requester_id: string;
  requester_type: 'user' | 'hospital';
  hospital_id: string | null;
  blood_group: string;
  units_required: number;
  units_received: number;
  urgency_level: 'normal' | 'urgent' | 'critical';
  patient_name: string | null;
  patient_age: number | null;
  patient_condition: string | null;
  hospital_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  description: string | null;
  status: 'active' | 'partially_fulfilled' | 'fulfilled' | 'cancelled' | 'expired';
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
  fulfilled_at: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  user_response: string | null;
  requester_name?: string;
}

const BloodConnect = () => {
  const { isDonor } = useBloodDonor();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('donors');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [donateBloodRequests, setDonateBloodRequests] = useState<BloodRequest[]>([]);
  const [loadingDonateRequests, setLoadingDonateRequests] = useState(true);

  // Handle tab from URL query parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['donors', 'hospitals', 'requests', 'donate', 'my-requests'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Fetch blood requests for Donate Blood section
  useEffect(() => {
    fetchDonateBloodRequests();
  }, []);

  // Refetch when tab changes to donate
  useEffect(() => {
    if (activeTab === 'donate') {
      fetchDonateBloodRequests();
    }
  }, [activeTab]);

  const fetchDonateBloodRequests = async () => {
    try {
      setLoadingDonateRequests(true);
      const { data, error } = await (supabase
        .from('blood_requests' as never)
        .select('*')
        .in('status', ['active', 'partially_fulfilled'])
        .order('created_at', { ascending: false })
        .limit(50) as unknown as {
          data: Array<Record<string, unknown>> | null;
          error: { message: string } | null;
        });

      if (error) throw error;

      // Fetch requester profiles separately
      const requesterIds = (data || [])
        .map((req: Record<string, unknown>) => req.requester_id as string)
        .filter((id: string | undefined): id is string => !!id);

      const requesterProfilesMap = new Map<string, { first_name: string | null; last_name: string | null }>();
      
      if (requesterIds.length > 0) {
        const { data: profilesData } = await (supabase
          .from('profiles' as never)
          .select('id, first_name, last_name')
          .in('id', requesterIds) as unknown as {
            data: Array<{ id: string; first_name: string | null; last_name: string | null }> | null;
          });

        if (profilesData) {
          profilesData.forEach(profile => {
            requesterProfilesMap.set(profile.id, profile);
          });
        }
      }

      const formattedRequests = (data || []).map((req: Record<string, unknown>) => {
        const requesterId = req.requester_id as string;
        const requester = requesterProfilesMap.get(requesterId);
        return {
          ...req,
          requester_name: requester
            ? `${requester.first_name || ''} ${requester.last_name || ''}`.trim()
            : 'Unknown',
          accepted_by: req.accepted_by as string | null || null,
          accepted_at: req.accepted_at as string | null || null,
          user_response: req.user_response as string | null || null,
        };
      }) as BloodRequest[];

      setDonateBloodRequests(formattedRequests);
    } catch (error: unknown) {
      console.error('Error fetching donate blood requests:', error);
    } finally {
      setLoadingDonateRequests(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-background to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-destructive" />
                Blood Connect
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Connect with verified donors and save lives
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate('/dashboard/user/bloodconnect/chat')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Messages</span>
                <span className="sm:hidden">Chat</span>
              </Button>
              <Button
                onClick={() => setShowProfileDialog(true)}
                variant="outline"
                className="border-rose-200 text-rose-700 hover:bg-rose-50"
                size="sm"
              >
                <UserCircle className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">
                  {isDonor ? 'Update Profile' : 'Register'}
                </span>
                <span className="sm:hidden">Profile</span>
                {isDonor && (
                  <Badge className="ml-2 bg-green-600 text-white text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Registered
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="border shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 text-base hover:bg-blue-50 hover:border-blue-300 hover:shadow-md transition-all"
                  onClick={() => navigate('/dashboard/user/bloodconnect/chat')}
                >
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  View Messages
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 text-base hover:bg-green-50 hover:border-green-300 hover:shadow-md transition-all"
                  onClick={() => setActiveTab('my-requests')}
                >
                  <List className="h-5 w-5 text-green-600" />
                  My Requests
                </Button>
              </CardContent>
            </Card>


            <Card className="border shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Community Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                    <span className="text-base text-blue-100 font-medium">Active Donors</span>
                    <span className="text-2xl font-bold">500+</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                    <span className="text-base text-blue-100 font-medium">Lives Saved</span>
                    <span className="text-2xl font-bold">1,200+</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                    <span className="text-base text-blue-100 font-medium">This Month</span>
                    <span className="text-2xl font-bold">85+</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9">
            <Card className="border shadow-md hover:shadow-lg transition-shadow">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="border-b px-6 pt-6 pb-4">
                  <TabsList className="grid w-full grid-cols-5 bg-muted/50 h-12">
                    <TabsTrigger 
                      value="donors" 
                      className="flex items-center gap-2 text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
                    >
                      <Users className="h-5 w-5" />
                      <span>Find Donors</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="hospitals" 
                      className="flex items-center gap-2 text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
                    >
                      <Building2 className="h-5 w-5" />
                      <span>Hospitals</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="requests" 
                      className="flex items-center gap-2 text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
                    >
                      <Droplet className="h-5 w-5" />
                      <span>Request Blood</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="donate" 
                      className="flex items-center gap-2 text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
                    >
                      <Heart className="h-5 w-5" />
                      <span>Donate Blood</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="my-requests" 
                      className="flex items-center gap-2 text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
                    >
                      <List className="h-5 w-5" />
                      <span>My Requests</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-6">
                  {/* Find Donors Tab */}
                  <TabsContent value="donors" className="mt-0">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-1">Available Blood Donors</h2>
                      <p className="text-sm text-muted-foreground">
                        Browse verified donors in your area. Click on any donor to start a conversation.
                      </p>
                    </div>
                    <BloodDonorList />
                  </TabsContent>

                  {/* Hospitals Tab */}
                  <TabsContent value="hospitals" className="mt-0">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-1">Hospital Blood Inventory</h2>
                      <p className="text-sm text-muted-foreground">
                        Browse hospitals with available blood. Request blood directly from hospitals.
                      </p>
                    </div>
                    <HospitalList />
                  </TabsContent>

                  {/* Request Blood Tab */}
                  <TabsContent value="requests" className="mt-0">
                    <div className="grid lg:grid-cols-2 gap-6">
                      <div>
                        <div className="mb-6">
                          <h2 className="text-xl font-semibold text-gray-900 mb-1">Create Blood Request</h2>
                          <p className="text-sm text-muted-foreground">
                            Fill out the form below to request blood. Your request will be visible to all registered donors.
                          </p>
                        </div>
                        <BloodRequestForm onSuccess={() => setActiveTab('my-requests')} />
                      </div>
                      <Card className="bg-gradient-to-br from-rose-50 to-red-50 border-rose-200">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Heart className="h-5 w-5 text-destructive" />
                            How It Works
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <ol className="space-y-3">
                              {[
                                { step: 1, title: "Create Request", text: "Fill in all required details including blood group and urgency level" },
                                { step: 2, title: "Get Matched", text: "Available donors will see your request instantly" },
                                { step: 3, title: "Connect & Chat", text: "Donors can contact you directly via chat or phone" },
                                { step: 4, title: "Coordinate", text: "Arrange donation location and time with the donor" },
                                { step: 5, title: "Complete", text: "Mark your request as fulfilled after receiving blood" }
                              ].map(({ step, title, text }) => (
                                <li key={step} className="flex gap-3 items-start">
                                  <div className="flex-shrink-0 w-8 h-8 bg-destructive text-white rounded-full flex items-center justify-center font-bold text-sm">
                                    {step}
                                  </div>
                                  <div className="flex-1 pt-0.5">
                                    <h4 className="font-semibold text-sm text-gray-900 mb-0.5">{title}</h4>
                                    <p className="text-xs text-gray-600">{text}</p>
                                  </div>
                                </li>
                              ))}
                            </ol>
                            <div className="pt-3 border-t border-rose-200">
                              <div className="flex items-start gap-2 bg-white/60 p-3 rounded-lg">
                                <Sparkles className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-gray-700">
                                  <strong>Pro Tip:</strong> Set urgency level to "Critical" for emergency situations. Your request will be prioritized and shown to more donors.
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Donate Blood Tab */}
                  <TabsContent value="donate" className="mt-0">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-1">Donate Blood</h2>
                      <p className="text-sm text-muted-foreground">
                        Help save lives by responding to blood requests. Accept requests to coordinate with those in need.
                      </p>
                    </div>
                    {loadingDonateRequests ? (
                      <div className="text-center py-12">
                        <div className="animate-spin h-8 w-8 border-2 border-red-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading blood requests...</p>
                      </div>
                    ) : donateBloodRequests.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <Droplet className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                          <p className="text-muted-foreground font-medium">No active blood requests</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Check back later for new requests. Your help can save lives!
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {donateBloodRequests.map((request) => {
                          const getUrgencyColor = (urgency: string) => {
                            switch (urgency) {
                              case 'critical': return 'bg-red-600 text-white';
                              case 'urgent': return 'bg-orange-600 text-white';
                              default: return 'bg-blue-600 text-white';
                            }
                          };

                          const isAccepted = request.accepted_by === user?.id;

                          return (
                            <Card key={request.id} className={`border-2 hover:shadow-lg transition-all ${isAccepted ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                              <CardHeader>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                      <Badge className={`${getUrgencyColor(request.urgency_level)} text-sm px-3 py-1`}>
                                        {request.blood_group}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {request.urgency_level}
                                      </Badge>
                                      {isAccepted && (
                                        <Badge className="bg-green-600 text-white text-xs">
                                          <Shield className="h-3 w-3 mr-1" />
                                          Accepted
                                        </Badge>
                                      )}
                                    </div>
                                    <CardTitle className="text-lg">
                                      {request.patient_name || request.requester_name || 'Blood Request'}
                                    </CardTitle>
                                    {request.patient_condition && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {request.patient_condition}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  <div className="space-y-2 text-sm">
                                    {request.address && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <MapPin className="h-4 w-4" />
                                        <span className="line-clamp-1">{request.address}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Phone className="h-4 w-4" />
                                      <span>{request.contact_phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Clock className="h-4 w-4" />
                                      <span>{new Date(request.created_at).toLocaleString()}</span>
                                    </div>
                                    {request.units_received > 0 && (
                                      <div className="flex items-center gap-2 text-green-600 font-medium">
                                        <Droplet className="h-4 w-4" />
                                        <span>{request.units_received}/{request.units_required} units received</span>
                                      </div>
                                    )}
                                  </div>

                                  {request.description && (
                                    <div className="p-3 bg-muted rounded-lg">
                                      <p className="text-sm text-muted-foreground line-clamp-3">
                                        {request.description}
                                      </p>
                                    </div>
                                  )}

                                  <div className="flex gap-2 pt-2">
                                    {!isAccepted ? (
                                      <>
                                        <Button
                                          size="sm"
                                          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                          onClick={async () => {
                                            if (!user) {
                                              toast({
                                                title: 'Error',
                                                description: 'Please login to accept requests',
                                                variant: 'destructive',
                                              });
                                              return;
                                            }

                                            try {
                                              const { error } = await (supabase
                                                .from('blood_requests' as never)
                                                .update({
                                                  accepted_by: user.id,
                                                  accepted_at: new Date().toISOString(),
                                                } as never)
                                                .eq('id', request.id) as unknown as { error: { message: string } | null });

                                              if (error) throw error;

                                              toast({
                                                title: 'Success',
                                                description: 'You have accepted this blood request. Contact the requester to coordinate donation.',
                                              });

                                              fetchDonateBloodRequests();
                                            } catch (error: unknown) {
                                              const errorMessage = error instanceof Error ? error.message : 'Failed to accept request';
                                              toast({
                                                title: 'Error',
                                                description: errorMessage,
                                                variant: 'destructive',
                                              });
                                            }
                                          }}
                                        >
                                          <Heart className="h-4 w-4 mr-2" />
                                          Accept Request
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => navigate(`/dashboard/user/bloodconnect/chat?requestId=${request.id}`)}
                                        >
                                          <MessageCircle className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => window.open(`tel:${request.contact_phone}`, '_blank')}
                                        >
                                          <Phone className="h-4 w-4" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button
                                          size="sm"
                                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                          onClick={() => navigate(`/dashboard/user/bloodconnect/chat?requestId=${request.id}`)}
                                        >
                                          <MessageCircle className="h-4 w-4 mr-2" />
                                          Continue Chat
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => window.open(`tel:${request.contact_phone}`, '_blank')}
                                        >
                                          <Phone className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* My Requests Tab */}
                  <TabsContent value="my-requests" className="mt-0">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-1">My Blood Requests</h2>
                      <p className="text-sm text-muted-foreground">
                        Track and manage all your blood requests. View status, chat with donors, and update requests.
                      </p>
                    </div>
                    <BloodRequestList showMyRequests={true} />
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-destructive" />
              {isDonor ? 'Update Donor Profile' : 'Become a Blood Donor'}
              {isDonor && (
                <Badge className="bg-green-600 text-white ml-2">
                  <Shield className="h-3 w-3 mr-1" />
                  Registered
                </Badge>
              )}
            </DialogTitle>
            <CardDescription>
              {isDonor 
                ? 'Update your donor information and availability status.'
                : 'Join our community of lifesavers. Register now to help those in need.'
              }
            </CardDescription>
          </DialogHeader>
          <div className="mt-4">
            <BloodDonorRegistration />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BloodConnect;
