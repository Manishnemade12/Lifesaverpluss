import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Clock, User, Phone, Mail, Droplet, MessageCircle, History } from 'lucide-react';

interface UserHospitalRequest {
  id: string;
  user_id: string;
  hospital_id: string;
  blood_group: string;
  units_required: number;
  units_approved: number;
  urgency_level: string;
  patient_name: string | null;
  patient_age: number | null;
  patient_condition: string | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  description: string | null;
  status: string;
  hospital_response: string | null;
  responded_at: string | null;
  created_at: string;
  user_name?: string;
}

const HospitalRequestsManager = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<UserHospitalRequest[]>([]);
  const [historyRequests, setHistoryRequests] = useState<UserHospitalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<UserHospitalRequest | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [responseText, setResponseText] = useState('');
  const [unitsApproved, setUnitsApproved] = useState(1);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRequests();
      subscribeToRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Fetch only pending requests (unresponded)
      const { data: pendingData, error: pendingError } = await supabase
        .from('user_hospital_blood_requests')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .eq('hospital_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      // Fetch history (approved and rejected)
      const { data: historyData, error: historyError } = await supabase
        .from('user_hospital_blood_requests')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .eq('hospital_id', user.id)
        .in('status', ['approved', 'rejected'])
        .order('responded_at', { ascending: false });

      if (historyError) throw historyError;

      const pendingWithNames = (pendingData || []).map((req: any) => ({
        ...req,
        user_name: req.profiles 
          ? `${req.profiles.first_name || ''} ${req.profiles.last_name || ''}`.trim() 
          : 'Unknown User'
      }));

      const historyWithNames = (historyData || []).map((req: any) => ({
        ...req,
        user_name: req.profiles 
          ? `${req.profiles.first_name || ''} ${req.profiles.last_name || ''}`.trim() 
          : 'Unknown User'
      }));

      setRequests(pendingWithNames);
      setHistoryRequests(historyWithNames);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRequests = () => {
    if (!user) return;

    const channel = supabase
      .channel(`hospital_requests_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_hospital_blood_requests',
          filter: `hospital_id=eq.${user.id}`,
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleApprove = (request: UserHospitalRequest) => {
    setSelectedRequest(request);
    setAction('approve');
    setUnitsApproved(Math.min(request.units_required, 10));
    setResponseText('');
    setShowDialog(true);
  };

  const handleReject = (request: UserHospitalRequest) => {
    setSelectedRequest(request);
    setAction('reject');
    setResponseText('');
    setShowDialog(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedRequest || !action) return;

    setProcessing(true);
    try {
      if (action === 'approve') {
        // Check inventory availability
        const { data: inventory, error: invError } = await supabase
          .from('hospital_blood_inventory')
          .select('units_available, units_reserved')
          .eq('hospital_id', user?.id)
          .eq('blood_group', selectedRequest.blood_group)
          .single();

        if (invError) throw invError;

        const available = (inventory?.units_available || 0) - (inventory?.units_reserved || 0);
        if (available < unitsApproved) {
          toast({
            title: 'Error',
            description: `Only ${available} units available. Cannot approve ${unitsApproved} units.`,
            variant: 'destructive',
          });
          setProcessing(false);
          return;
        }

        const { error } = await supabase
          .from('user_hospital_blood_requests')
          .update({
            status: 'approved',
            units_approved: unitsApproved,
            hospital_response: responseText || `Approved ${unitsApproved} units of ${selectedRequest.blood_group} blood.`,
            responded_at: new Date().toISOString(),
          })
          .eq('id', selectedRequest.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Request approved successfully',
        });
      } else {
        const { error } = await supabase
          .from('user_hospital_blood_requests')
          .update({
            status: 'rejected',
            hospital_response: responseText || 'Request rejected.',
            responded_at: new Date().toISOString(),
          })
          .eq('id', selectedRequest.id);

        if (error) throw error;

        toast({
          title: 'Request Rejected',
          description: 'Request has been rejected',
        });
      }

      setShowDialog(false);
      setSelectedRequest(null);
      setAction(null);
      fetchRequests();
    } catch (error: any) {
      console.error('Error processing request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'fulfilled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Fulfilled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return <Badge className="bg-red-600 text-white">Critical</Badge>;
      case 'urgent':
        return <Badge className="bg-orange-600 text-white">Urgent</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with History Button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Showing {requests.length} pending request{requests.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowHistoryDialog(true)}
          className="flex items-center gap-2"
        >
          <History className="h-4 w-4" />
          View History ({historyRequests.length})
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No pending blood requests</p>
            <p className="text-sm text-muted-foreground mt-2">
              All requests have been responded to. Check history for past requests.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{request.user_name}</CardTitle>
                      {getStatusBadge(request.status)}
                      {getUrgencyBadge(request.urgency_level)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Droplet className="h-4 w-4 text-red-600" />
                        <span>{request.blood_group}</span>
                      </div>
                      <span>{request.units_required} units required</span>
                      {request.status === 'approved' && (
                        <span className="text-green-600 font-medium">{request.units_approved} units approved</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {request.patient_name && (
                    <div>
                      <span className="text-sm font-medium">Patient: </span>
                      <span className="text-sm">{request.patient_name}</span>
                      {request.patient_age && <span className="text-sm text-muted-foreground"> ({request.patient_age} years)</span>}
                    </div>
                  )}
                  {request.patient_condition && (
                    <div>
                      <span className="text-sm font-medium">Condition: </span>
                      <span className="text-sm">{request.patient_condition}</span>
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{request.contact_phone}</span>
                    </div>
                    {request.contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{request.contact_email}</span>
                      </div>
                    )}
                  </div>
                  {request.description && (
                    <div className="text-sm">
                      <span className="font-medium">Details: </span>
                      <span>{request.description}</span>
                    </div>
                  )}
                  {request.hospital_response && (
                    <div className="p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Your Response: </span>
                      <span className="text-sm">{request.hospital_response}</span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    {request.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => handleApprove(request)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(request)}
                          variant="destructive"
                          className="flex-1"
                          size="sm"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={() => navigate(`/dashboard/hospital/bloodconnect/chat?hospitalRequestId=${request.id}&userId=${request.user_id}`)}
                      variant="outline"
                      size="sm"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve/Reject Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve Blood Request' : 'Reject Blood Request'}
            </DialogTitle>
            <DialogDescription>
              {action === 'approve' 
                ? 'Enter the number of units to approve and any additional notes.'
                : 'Provide a reason for rejecting this request (optional).'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {action === 'approve' && selectedRequest && (
              <div>
                <Label htmlFor="units_approved">Units to Approve (Max: {selectedRequest.units_required})</Label>
                <Input
                  id="units_approved"
                  type="number"
                  min="1"
                  max={selectedRequest.units_required}
                  value={unitsApproved}
                  onChange={(e) => setUnitsApproved(parseInt(e.target.value) || 1)}
                />
              </div>
            )}
            <div>
              <Label htmlFor="response_text">
                {action === 'approve' ? 'Response Message (Optional)' : 'Rejection Reason (Optional)'}
              </Label>
              <Textarea
                id="response_text"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder={action === 'approve' 
                  ? 'Add any additional notes...'
                  : 'Provide reason for rejection...'}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitResponse}
                disabled={processing}
                className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {processing ? 'Processing...' : action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Request History
            </DialogTitle>
            <DialogDescription>
              View all approved and rejected blood requests
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {historyRequests.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No history available</p>
              </div>
            ) : (
              historyRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{request.user_name}</CardTitle>
                          {getStatusBadge(request.status)}
                          {getUrgencyBadge(request.urgency_level)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Droplet className="h-4 w-4 text-red-600" />
                            <span>{request.blood_group}</span>
                          </div>
                          <span>{request.units_required} units required</span>
                          {request.status === 'approved' && (
                            <span className="text-green-600 font-medium">{request.units_approved} units approved</span>
                          )}
                          {request.responded_at && (
                            <span className="text-xs">
                              Responded: {new Date(request.responded_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {request.patient_name && (
                        <div>
                          <span className="text-sm font-medium">Patient: </span>
                          <span className="text-sm">{request.patient_name}</span>
                          {request.patient_age && <span className="text-sm text-muted-foreground"> ({request.patient_age} years)</span>}
                        </div>
                      )}
                      {request.patient_condition && (
                        <div>
                          <span className="text-sm font-medium">Condition: </span>
                          <span className="text-sm">{request.patient_condition}</span>
                        </div>
                      )}
                      <div className="grid md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{request.contact_phone}</span>
                        </div>
                        {request.contact_email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{request.contact_email}</span>
                          </div>
                        )}
                      </div>
                      {request.description && (
                        <div className="text-sm">
                          <span className="font-medium">Details: </span>
                          <span>{request.description}</span>
                        </div>
                      )}
                      {request.hospital_response && (
                        <div className={`p-3 rounded-lg ${
                          request.status === 'approved' 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-red-50 border border-red-200'
                        }`}>
                          <span className="text-sm font-medium">
                            {request.status === 'approved' ? 'Approval Response: ' : 'Rejection Reason: '}
                          </span>
                          <span className="text-sm">{request.hospital_response}</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        Requested: {new Date(request.created_at).toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HospitalRequestsManager;

