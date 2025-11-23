
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import UserAuth from "./pages/auth/UserAuth";
import ResponderAuth from "./pages/auth/ResponderAuth";
import HospitalAuth from "./pages/auth/HospitalAuth";
import UserDashboard from "./pages/dashboard/UserDashboard";
import ResponderDashboard from "./pages/dashboard/ResponderDashboard";
import HospitalDashboard from "./pages/dashboard/HospitalDashboard";
import NotFound from "./pages/NotFound";
import ResolvedHistory from "./components/ResolvedHistory";
import BloodConnect from "./pages/BloodConnect";
import HospitalBloodConnect from "./pages/HospitalBloodConnect";
import BloodChatPage from "./pages/BloodChatPage";
import HospitalDetail from "./pages/HospitalDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth/user" element={<UserAuth />} />
            <Route path="/auth/responder" element={<ResponderAuth />} />
            <Route path="/auth/hospital" element={<HospitalAuth />} />
            <Route
              path="/dashboard/user"
              element={
                <ProtectedRoute requiredUserType="user">
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/user/bloodconnect"
              element={
                <ProtectedRoute requiredUserType="user">
                  <BloodConnect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/user/bloodconnect/chat"
              element={
                <ProtectedRoute>
                  <BloodChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/user/bloodconnect/hospitals/:id"
              element={
                <ProtectedRoute requiredUserType="user">
                  <HospitalDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/hospital/bloodconnect/chat"
              element={
                <ProtectedRoute>
                  <BloodChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/responder"
              element={
                <ProtectedRoute requiredUserType="responder">
                  <ResponderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/hospital"
              element={
                <ProtectedRoute requiredUserType="hospital">
                  <HospitalDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/hospital/history"
              element={
                <ProtectedRoute requiredUserType="hospital">
                  <ResolvedHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/hospital/bloodconnect"
              element={
                <ProtectedRoute>
                  <HospitalBloodConnect />
                </ProtectedRoute>
              }
            />


            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
