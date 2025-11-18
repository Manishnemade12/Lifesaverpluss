import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users, Shield, AlertTriangle } from "lucide-react";

interface SOSRequest {
  id: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

interface ResponderStatsCardsProps {
  sosRequests?: SOSRequest[];
  historyRequests?: SOSRequest[];
}

export const ResponderStatsCards = ({ sosRequests = [], historyRequests = [] }: ResponderStatsCardsProps) => {
  // Calculate accurate statistics from real data
  const allRequests = [...sosRequests, ...historyRequests];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayResponses = allRequests.filter(request => {
    if (!request.created_at) return false;
    const requestDate = new Date(request.created_at);
    requestDate.setHours(0, 0, 0, 0);
    return requestDate.getTime() === today.getTime();
  }).length;

  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - 7);
  
  const weeklyResponses = allRequests.filter(request => {
    if (!request.created_at) return false;
    const requestDate = new Date(request.created_at);
    return requestDate >= thisWeekStart;
  }).length;

  const totalResponses = historyRequests.length;
  const activeRequests = sosRequests.length;

  // Calculate average response time (time between created_at and updated_at for resolved requests)
  const resolvedRequests = historyRequests.filter(r => r.status === 'resolved');
  let avgResponseTime = 0;
  if (resolvedRequests.length > 0) {
    const totalTime = resolvedRequests.reduce((acc, req) => {
      if (req.created_at && req.updated_at) {
        const created = new Date(req.created_at).getTime();
        const updated = new Date(req.updated_at).getTime();
        return acc + (updated - created);
      }
      return acc;
    }, 0);
    avgResponseTime = Math.round((totalTime / resolvedRequests.length) / (1000 * 60)); // Convert to minutes
  }

  return (
    <div className="grid md:grid-cols-4 gap-4">
      {/* Active Requests Card */}
      <Card className="border-l-4 border-l-red-500 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-red-50/30 overflow-hidden group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent mb-1">
                {activeRequests}
              </div>
              <div className="text-sm font-semibold text-gray-700">Active Requests</div>
              <div className="text-xs text-gray-500 mt-1">Requires attention</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-red-100 to-red-200 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
              <AlertTriangle className="h-7 w-7 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Responses Card */}
      <Card className="border-l-4 border-l-blue-500 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-blue-50/30 overflow-hidden group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent mb-1">
                {todayResponses}
              </div>
              <div className="text-sm font-semibold text-gray-700">Today's Responses</div>
              <div className="text-xs text-gray-500 mt-1">Handled today</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
              <Clock className="h-7 w-7 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* This Week Card */}
      <Card className="border-l-4 border-l-green-500 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-green-50/30 overflow-hidden group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent mb-1">
                {weeklyResponses}
              </div>
              <div className="text-sm font-semibold text-gray-700">This Week</div>
              <div className="text-xs text-gray-500 mt-1">Last 7 days</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-100 to-green-200 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
              <Users className="h-7 w-7 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Responses Card */}
      <Card className="border-l-4 border-l-purple-500 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-purple-50/30 overflow-hidden group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent mb-1">
                {totalResponses}
              </div>
              <div className="text-sm font-semibold text-gray-700">Total Responses</div>
              <div className="text-xs text-gray-500 mt-1">All time records</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
              <Shield className="h-7 w-7 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
