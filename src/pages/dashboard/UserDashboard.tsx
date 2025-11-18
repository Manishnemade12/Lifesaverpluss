import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Ambulance, Phone, MapPin, Users, History, Clock, Flag, User, MoreHorizontalIcon, FileText, Sparkles, Contact, Heart, MessageCircle, Building2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEmergencyAlerts } from "@/hooks/useEmergencyAlerts";
import { useEmergencyContacts } from "@/hooks/useEmergencyContacts";
import { useAnonymousReports } from "@/hooks/useAnonymousReports";
import { useToast } from "@/hooks/use-toast";
import { NearbyRespondersCard } from "@/components/NearbyRespondersCard";
import { AnonymousReportDialog } from "@/components/AnonymousReportDialog";
// import { HospitalSOSDialog } from "@/components/HospitalSOSDialog";
import UserProfile from "@/components/UserProfile";
import AnonymousReportForm from "@/components/AnonymousReportForm";
import AnonymousReportsHistory from "@/components/AnonymousReportsHistory";
import { useHospitalSOS } from '@/hooks/useHospitalSOS';
import { supabase } from "@/integrations/supabase/client";
import SOSButton from "@/components/r/SOSButton";
import { sendSOSMail } from "@/hooks/mailhook";
import EmergencyContacts from "@/components/EmergencyContacts";
import { useShakeDetection } from "@/hooks/useShakeDetection";
import MedicalReports from "@/components/MedicalReports";
import AISymptomChecker from "@/components/AISymptomChecker";
import AIVoiceEmergency from "@/components/AIVoiceEmergency";
import AIHealthRiskAnalyzer from "@/components/AIHealthRiskAnalyzer";
import BloodConnect from "@/pages/BloodConnect";
import HospitalBloodRequestsList from "@/components/HospitalBloodRequestsList";

interface HospitalSOSDialogProps {
  userLocation: { lat: number; lng: number } | null;
}

const UserDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const { alerts, createAlert } = useEmergencyAlerts();
  const { contacts, addContact, removeContact } = useEmergencyContacts();
  const { submitReport } = useAnonymousReports();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [sosCountdown, setSosCountdown] = useState(0);
  const [activeSOS, setActiveSOS] = useState(false);
  const [selectedSOSType, setSelectedSOSType] = useState<'medical' | 'safety' | 'general'>('medical');
  const [newContact, setNewContact] = useState({ name: "", phone: "" });
  const [location, setLocation] = useState("Getting location...");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showMedicalReports, setShowMedicalReports] = useState(false);
  const [showAISymptomChecker, setShowAISymptomChecker] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [shakeEnabled, setShakeEnabled] = useState(true);
  const { sendHospitalSOS, loading } = useHospitalSOS();

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserCoords(coords);
          setLocation(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
        },
        () => {
          setLocation("Location unavailable");
        }
      );
    }
  }, []);

  const handleSOSActivated = useCallback(async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            description: location
          };

          // Use the selected SOS type instead of hardcoded "medical"
          await createAlert(selectedSOSType, locationData, `${selectedSOSType.toUpperCase()} emergency assistance needed`);
          setActiveSOS(false);
          setSelectedSOSType('medical'); // Reset to default
        },
        () => {
          toast({
            title: "Location Error",
            description: "Could not get your location for the emergency alert.",
            variant: "destructive"
          });
          setActiveSOS(false);
          setSelectedSOSType('medical'); // Reset to default
        }
      );
    }
  }, [selectedSOSType, location, createAlert, toast]);

  useEffect(() => {
    if (sosCountdown > 0) {
      const timer = setTimeout(() => setSosCountdown(sosCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (sosCountdown === 0 && activeSOS) {
      handleSOSActivated();
    }
  }, [sosCountdown, activeSOS, handleSOSActivated]);






  // Handle SOS button click
  // const handleSOSClick = async (type: "medical" | "safety" | "general") => {
  //   setSelectedSOSType(type); // Store the selected type
  //   setSosCountdown(3);
  //   setActiveSOS(true);

  //   toast({
  //     title: "SOS Alert Starting",
  //     description: `${type.toUpperCase()} emergency alert in 3 seconds. Tap cancel to stop.`,
  //   });

  //   // if (type === "medical") {
  //   //   await handleAutoSendSOS(); // call directly
  //   // }
  // };

  const handleSOSClick = useCallback(async (type: "medical" | "safety" | "general") => {
    setSelectedSOSType(type);
    setSosCountdown(3);
    setActiveSOS(true);

    toast({
      title: "SOS Alert Starting",
      description: `${type.toUpperCase()} emergency alert in 3 seconds. Tap cancel to stop.`,
    });

    try {
      await sendSOSMail(type);
      toast({
        title: `${type.toUpperCase()} SOS Sent`,
        description: "Email has been successfully sent!",
      });
    } catch (error) {
      toast({
        title: "Failed to send SOS",
        description: "Please check your connection or location settings.",
      });
    }
  }, [toast]);

  // Shake detection for SOS trigger
  const handleShake = useCallback(() => {
    if (!activeSOS && sosCountdown === 0) {
      toast({
        title: "Shake Detected!",
        description: "Triggering emergency SOS...",
        variant: "destructive"
      });
      handleSOSClick("medical"); // Default to medical emergency on shake
    }
  }, [activeSOS, sosCountdown, toast, handleSOSClick]);

  const { isSupported, permissionStatus, requestPermission } = useShakeDetection({
    threshold: 15, // m/s² acceleration threshold
    debounceTime: 2000, // 2 seconds between shake triggers
    onShake: handleShake,
    enabled: shakeEnabled,
  });

  const handleSOSCancel = () => {
    setSosCountdown(0);
    setActiveSOS(false);
    setSelectedSOSType('medical'); // Reset to default
    toast({
      title: "SOS Cancelled",
      description: "Emergency alert has been cancelled.",
    });
  };

  const handleAddContact = async () => {
    if (newContact.name && newContact.phone) {
      await addContact(newContact.name, newContact.phone);
      setNewContact({ name: "", phone: "" });
      // Toast is already handled in the hook
    } else {
      toast({
        title: "Missing Information",
        description: "Please provide both name and phone number.",
        variant: "destructive",
      });
    }
  };

  const handleCallContact = (phone: string) => {
    if (!phone) return;
    window.open(`tel:${phone}`);
  };

  const handleRemoveContact = async (id: string) => {
    await removeContact(id);
    // Toast is already handled in the hook
  };

  const call911 = () => {
    window.open("tel:911");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-red-100 text-red-800";
      case "acknowledged": return "bg-yellow-100 text-yellow-800";
      case "responding": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "medical": return <Ambulance className="h-4 w-4" />;
      case "safety": return <Shield className="h-4 w-4" />;
      case "general": return <Flag className="h-4 w-4" />;
      default: return <Flag className="h-4 w-4" />;
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-red-50/20 to-orange-50/20">
      {/* World-Class Professional Header */}
      <header className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Brand Section - Left */}
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-br from-red-600 to-red-700 rounded-xl shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 via-red-700 to-gray-900 bg-clip-text text-transparent">
                  LifeSaver+ Dashboard
                </span>
                {profile && (
                  <span className="text-xs sm:text-sm text-gray-600 hidden sm:flex items-center gap-1.5 mt-0.5">
                    <User className="h-3 w-3" />
                    {profile.first_name} {profile.last_name}
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
                className="hidden sm:flex items-center gap-2 hover:bg-gray-50 transition-all duration-200 border-gray-200"
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

              {/* Medical Reports Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMedicalReports(true)}
                className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 hover:from-blue-100 hover:to-cyan-100 text-blue-700 hover:text-blue-800 hidden sm:flex items-center gap-2 transition-all duration-200 shadow-sm"
              >
                <FileText className="h-4 w-4" />
                <span>Medical</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMedicalReports(true)}
                className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 hover:from-blue-100 hover:to-cyan-100 text-blue-700 sm:hidden p-2"
                title="Medical Reports"
              >
                <FileText className="h-4 w-4" />
              </Button>

              {/* AI Symptom Checker Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAISymptomChecker(true)}
                className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 hover:from-purple-100 hover:to-pink-100 text-purple-700 hover:text-purple-800 hidden sm:flex items-center gap-2 transition-all duration-200 shadow-sm"
              >
                <Sparkles className="h-4 w-4" />
                <span>AI Check</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAISymptomChecker(true)}
                className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 hover:from-purple-100 hover:to-pink-100 text-purple-700 sm:hidden p-2"
                title="AI Symptom Checker"
              >
                <Sparkles className="h-4 w-4" />
              </Button>

              {/* Blood Connect Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/user/bloodconnect')}
                className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200 hover:from-red-100 hover:to-pink-100 text-red-700 hover:text-red-800 hidden sm:flex items-center gap-2 transition-all duration-200 shadow-sm"
              >
                <Heart className="h-4 w-4" />
                <span>Blood Connect</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/user/bloodconnect')}
                className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200 hover:from-red-100 hover:to-pink-100 text-red-700 sm:hidden p-2"
                title="Blood Connect"
              >
                <Heart className="h-4 w-4" />
              </Button>

              {/* Message/Chat Button - Properly Positioned on Right */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/user/bloodconnect/chat')}
                className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 hover:from-blue-100 hover:to-cyan-100 text-blue-700 hover:text-blue-800 hidden sm:flex items-center gap-2 transition-all duration-200 shadow-sm relative"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Chat</span>
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-blue-500 rounded-full animate-pulse border-2 border-white"></span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/user/bloodconnect/chat')}
                className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 hover:from-blue-100 hover:to-cyan-100 text-blue-700 sm:hidden p-2 relative"
                title="Chat"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-blue-500 rounded-full animate-pulse border border-white"></span>
              </Button>

              {/* Emergency Contacts Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowContacts(true)}
                className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:from-green-100 hover:to-emerald-100 text-green-700 hover:text-green-800 hidden sm:flex items-center gap-2 transition-all duration-200 shadow-sm"
              >
                <Users className="h-4 w-4" />
                <span>Contacts</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowContacts(true)}
                className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:from-green-100 hover:to-emerald-100 text-green-700 sm:hidden p-2"
                title="Emergency Contacts"
              >
                <Users className="h-4 w-4" />
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
        </div>
      </header>

      {/* Modals and Dialogs */}
      <UserProfile
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        onProfileUpdate={() => {
          setShowProfile(false);
        }}
      />
      <MedicalReports
        isOpen={showMedicalReports}
        onClose={() => setShowMedicalReports(false)}
      />
      <AISymptomChecker
        isOpen={showAISymptomChecker}
        onClose={() => setShowAISymptomChecker(false)}
      />
      {/* Contacts Dialog */}
      <Dialog open={showContacts} onOpenChange={setShowContacts}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Emergency Contacts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Add Contact Form */}
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Add New Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="contactName">Name</Label>
                    <Input
                      id="contactName"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      placeholder="Contact name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">Phone</Label>
                    <Input
                      id="contactPhone"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      placeholder="+91-XXXXXXXXXX"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleAddContact} 
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={!newContact.name || !newContact.phone}
                    >
                      Add Contact
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contacts List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Emergency Contacts ({contacts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {contacts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No emergency contacts yet</p>
                    <p className="text-sm mt-1">Add a contact above to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900">{contact.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <a 
                              href={`tel:${contact.phone}`}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              {contact.phone}
                            </a>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleCallContact(contact.phone)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Phone className="h-4 w-4 mr-1" />
                            Call
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveContact(contact.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Enhanced SOS Countdown Overlay */}
        {sosCountdown > 0 && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="p-10 text-center shadow-2xl border-2 border-red-500 bg-gradient-to-br from-white to-red-50/30 max-w-md w-full mx-4">
              <div className="text-8xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent mb-6 animate-pulse">
                {sosCountdown}
              </div>
              <p className="text-xl font-semibold text-gray-900 mb-2">
                {selectedSOSType.toUpperCase()} Emergency Alert
              </p>
              <p className="text-sm text-gray-600 mb-6">Activating in {sosCountdown} seconds...</p>
              <Button 
                onClick={handleSOSCancel} 
                variant="outline"
                className="bg-red-50 border-red-300 hover:bg-red-100 text-red-700 font-semibold"
              >
                Cancel SOS
              </Button>
            </Card>
          </div>
        )}

        {/* Enhanced Tabs Navigation */}
        <Tabs defaultValue="emergency" className="space-y-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-1.5">
            <TabsList className="grid w-full grid-cols-5 h-auto bg-transparent gap-1">
              <TabsTrigger 
                value="emergency"
                className="text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-lg font-semibold"
              >
                <AlertTriangle className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Emergency</span>
                <span className="sm:hidden">SOS</span>
              </TabsTrigger>
              <TabsTrigger 
                value="ai-features"
                className="text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-lg font-semibold"
              >
                <Sparkles className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">AI Features</span>
                <span className="sm:hidden">AI</span>
              </TabsTrigger>
              <TabsTrigger 
                value="hospital-requests"
                className="text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-lg font-semibold"
              >
                <Building2 className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Hospitals</span>
                <span className="sm:hidden">Hosp</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history"
                className="text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-lg font-semibold"
              >
                <History className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">History</span>
                <span className="sm:hidden">Hist</span>
              </TabsTrigger>
              <TabsTrigger 
                value="reports"
                className="text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 rounded-lg font-semibold"
              >
                <FileText className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Reports</span>
                <span className="sm:hidden">Rep</span>
              </TabsTrigger>
            </TabsList>
          </div>

          

          <TabsContent value="emergency" className="space-y-6 mt-6">
            {/* Enhanced Shake Detection Status */}
            {isSupported && (
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-blue-900 mb-2 flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Shake to Trigger SOS
                      </h3>
                      <p className="text-sm text-blue-700">
                        {permissionStatus === 'granted' 
                          ? '✅ Shake detection is active. Shake your device to trigger emergency SOS.'
                          : permissionStatus === 'denied'
                          ? '⚠️ Motion permission denied. Click "Enable" to grant access.'
                          : '📱 Click "Enable" to allow shake detection for emergency SOS.'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {permissionStatus !== 'granted' && (
                        <Button 
                          onClick={requestPermission}
                          size="sm"
                          variant="outline"
                          className="border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold"
                        >
                          Enable
                        </Button>
                      )}
                      <Button
                        onClick={() => setShakeEnabled(!shakeEnabled)}
                        size="sm"
                        variant={shakeEnabled ? "default" : "outline"}
                        className={shakeEnabled ? "bg-blue-600 hover:bg-blue-700" : ""}
                      >
                        {shakeEnabled ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced SOS Button */}
            <div className="flex justify-center">
              <SOSButton />
            </div>

            {/* Enhanced Emergency Actions Card */}
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 rounded-t-lg border-b border-red-100">
                <CardTitle className="flex items-center space-x-3 text-xl sm:text-2xl font-bold">
                  <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-md">
                    <Ambulance className="h-6 w-6 text-white" />
                  </div>
                  <span>Emergency Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <Button
                    onClick={() => handleSOSClick("medical")}
                    className="h-24 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
                    disabled={sosCountdown > 0}
                  >
                    <div className="text-center">
                      <Ambulance className="h-7 w-7 mx-auto mb-2" />
                      <div className="font-bold text-base">Medical Emergency</div>
                      <div className="text-xs opacity-90 mt-1">Critical Health Issue</div>
                    </div>
                  </Button>

                  <Button
                    onClick={() => handleSOSClick("safety")}
                    className="h-24 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
                    disabled={sosCountdown > 0}
                  >
                    <div className="text-center">
                      <Shield className="h-7 w-7 mx-auto mb-2" />
                      <div className="font-bold text-base">Personal Safety</div>
                      <div className="text-xs opacity-90 mt-1">Security Threat</div>
                    </div>
                  </Button>

                  <Button
                    onClick={() => handleSOSClick("general")}
                    className="h-24 bg-gradient-to-br from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
                    disabled={sosCountdown > 0}
                  >
                    <div className="text-center">
                      <Flag className="h-7 w-7 mx-auto mb-2" />
                      <div className="font-bold text-base">General Emergency</div>
                      <div className="text-xs opacity-90 mt-1">Other Assistance</div>
                    </div>
                  </Button>
                </div>

                {/* Enhanced Quick Actions */}
                <div className="grid md:grid-cols-4 gap-3">
                  <Button 
                    onClick={call911} 
                    variant="outline" 
                    className="border-2 border-red-500 text-red-600 hover:bg-red-50 font-semibold transition-all duration-200"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call 911
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-gray-300 hover:bg-gray-50 font-semibold transition-all duration-200"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Share Location
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-gray-300 hover:bg-gray-50 font-semibold transition-all duration-200"
                  >
                    <MoreHorizontalIcon className="h-4 w-4 mr-2" />
                    More Features
                  </Button>
                  <AnonymousReportDialog
                    onSubmit={submitReport}
                    trigger={
                      <Button 
                        variant="outline" 
                        className="w-full border-gray-300 hover:bg-gray-50 font-semibold transition-all duration-200"
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        Anonymous Report
                      </Button>
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Status Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-l-4 border-l-blue-500 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-blue-50/30 overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-600 mb-1">Current Location</p>
                      <p className="text-lg font-bold text-gray-900 truncate">{location}</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                      <MapPin className="h-7 w-7 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-green-50/30 overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-600 mb-1">Emergency Contacts</p>
                      <p className="text-lg font-bold text-gray-900">{contacts.length} Active</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                      <Users className="h-7 w-7 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <NearbyRespondersCard
                userLat={userCoords?.lat}
                userLng={userCoords?.lng}
              />
            </div>
          </TabsContent>

          {/* Enhanced AI Features Tab */}
          <TabsContent value="ai-features" className="space-y-6 mt-6">
            <div className="space-y-6">
              {/* AI Voice Emergency - Enhanced */}
              <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 rounded-xl border-2 border-purple-200 shadow-lg p-1">
                <AIVoiceEmergency 
                  onEmergencyDetected={(type, description) => {
                    setSelectedSOSType(type);
                    handleSOSClick(type);
                    toast({
                      title: '🚨 Emergency Detected via Voice!',
                      description: `AI detected ${type} emergency. SOS activated.`,
                      variant: 'destructive',
                    });
                  }}
                />
              </div>

              {/* Enhanced AI Symptom Checker Card */}
              <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-t-lg border-b border-purple-200">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-md">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    AI Symptom Checker
                  </CardTitle>
                  <p className="text-sm text-gray-700 mt-2 font-medium">
                    Describe your symptoms for AI-powered analysis and diagnosis suggestions
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <Button
                    onClick={() => setShowAISymptomChecker(true)}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold py-6"
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    Open AI Symptom Checker
                  </Button>
                </CardContent>
              </Card>

              {/* AI Health Risk Analyzer - Enhanced */}
              <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                <AIHealthRiskAnalyzer />
              </div>
            </div>
          </TabsContent>

          {/* Enhanced Reports Tab */}
          <TabsContent value="reports" className="space-y-6 mt-6">
            {/* Enhanced Medical Reports Section */}
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-t-lg border-b border-blue-100">
                <CardTitle className="flex items-center gap-3 text-xl font-bold">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  Medical Reports Management
                </CardTitle>
                <p className="text-sm text-gray-700 mt-2 font-medium">
                  Manage your medical history and reports securely
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <Button
                  onClick={() => setShowMedicalReports(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold py-6"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Manage Medical Reports
                </Button>
              </CardContent>
            </Card>
            <MedicalReports
              isOpen={showMedicalReports}
              onClose={() => setShowMedicalReports(false)}
            />

            {/* Enhanced Anonymous Reports */}
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-lg border-b border-amber-100">
                <CardTitle className="text-xl font-bold">Anonymous Safety Reports</CardTitle>
                <p className="text-sm text-gray-700 mt-2 font-medium">
                  Report safety concerns anonymously
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <AnonymousReportForm />
              </CardContent>
            </Card>

            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-t-lg border-b border-gray-100">
                <CardTitle className="text-xl font-bold">Report History</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <AnonymousReportsHistory />
              </CardContent>
            </Card>
          </TabsContent>
       
          {/* Enhanced History Tab */}
          <TabsContent value="history" className="space-y-6 mt-6">
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg border-b border-green-100">
                <CardTitle className="flex items-center space-x-3 text-xl font-bold">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md">
                    <History className="h-5 w-5 text-white" />
                  </div>
                  <span>SOS Alert History</span>
                </CardTitle>
                <p className="text-sm text-gray-700 mt-2 font-medium">
                  View all your past emergency alerts and their status
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className="border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50/50"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="p-3 bg-gradient-to-br from-red-100 to-red-200 rounded-lg">
                            {getTypeIcon(alert.type)}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-lg capitalize text-gray-900">{alert.type} Emergency</p>
                            <p className="text-sm text-gray-600 mt-1">{alert.location_description}</p>
                            {alert.description && (
                              <p className="text-sm text-gray-500 mt-2 italic">{alert.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <Badge className={`${getStatusColor(alert.status)} font-semibold px-3 py-1 mb-2`}>
                            {alert.status}
                          </Badge>
                          <p className="text-sm text-gray-600 font-medium">
                            {new Date(alert.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(alert.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <History className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">No Emergency Alerts Yet</h3>
                      <p className="text-gray-600 text-sm max-w-sm mx-auto">
                        Your emergency alert history will appear here once you send an SOS.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Hospital Requests Tab */}
          <TabsContent value="hospital-requests" className="space-y-6 mt-6">
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-t-lg border-b border-blue-100">
                <CardTitle className="flex items-center gap-3 text-xl font-bold">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  Hospital Blood Requests
                </CardTitle>
                <p className="text-sm text-gray-700 mt-2 font-medium">
                  View and respond to blood donation requests from hospitals
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <HospitalBloodRequestsList />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserDashboard;

