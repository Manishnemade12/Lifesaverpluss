
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, MapPin, Bell, User } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import UserProfile from "@/components/UserProfile";
import DummyLogin from "@/components/r/dummylogin";
import InstallButton from "@/components/InstallButton";
const Index = () => {
    const [showProfile, setShowProfile] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-red-600" />
              <span className="text-2xl font-bold text-gray-900">EmergencyConnect</span>
            </div>
            <div className="flex space-x-4 items-center">
              <Link to="/auth/user">
                <Button variant="outline">User Login</Button>
              </Link>
              <Link to="/auth/responder">
                <Button className="bg-red-600 hover:bg-red-700 ">Responder Login</Button>
              </Link>
              <Link to="/auth/hospital">
                <Button className="bg-blue-600 hover:bg-blue-700 ">Hospital Login</Button>
              </Link>
              <InstallButton />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className=""><h3>Click to view dummy login details</h3></span>
           <div className="flex items-between justify-center">
              <DummyLogin /> 
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 margin-top: 20px">
            Emergency Response Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect instantly with verified emergency responders and hospitals. Get help when you need it most with real-time location tracking and community safety reporting.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth/user">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
                User Access
              </Button>
            </Link>
            <Link to="/auth/responder">
              <Button size="lg" variant="outline" className="border-red-600 text-red-600 hover:bg-red-50 px-8 py-3">
               Responder Portal , social authorities
              </Button>
            </Link>
            <Link to="/auth/hospital">
              <Button size="lg" variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3">
                Hospital Portal
              </Button>
            </Link>
            <InstallButton />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How EmergencyConnect Works
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="space-y-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <Bell className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Instant SOS Alerts</h3>
                <p className="text-gray-600 text-sm">
                  One-tap emergency alerts with automatic location detection and responder notification.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="space-y-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Real-Time Tracking</h3>
                <p className="text-gray-600 text-sm">
                  GPS location sharing and live tracking during emergencies for faster response times.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="space-y-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Verified Responders</h3>
                <p className="text-gray-600 text-sm">
                  Connect with verified emergency responders including police, medical, and fire services.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="space-y-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Hospital Network</h3>
                <p className="text-gray-600 text-sm">
                  Direct connection to nearby hospitals for medical emergencies and ambulance services.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Join Our Emergency Network?
          </h2>
          <p className="text-gray-300 mb-8">
            Help save lives by connecting people in need with emergency responders and hospitals in real-time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth/user">
              <Button size="lg" className="bg-red-600 hover:bg-red-700">
                Register as User
              </Button>
            </Link>
            <Link to="/auth/responder">
              <Button size="lg" variant="outline" className="border-white text-gray hover:bg-white hover:text-gray-900">
                Become a Responder
              </Button>
            </Link>
            <Link to="/auth/hospital">
              <Button size="lg" variant="outline" className="border-white text-black hover:bg-white hover:text-gray-900">
                Register Hospital
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Shield className="h-6 w-6 text-red-600" />
            <span className="text-lg font-semibold text-gray-900">EmergencyConnect</span>
          </div>
          <p className="text-gray-600">
            © 2025 EmergencyConnect. Developed By @Team_Nakshtra as Kurukshetra Project.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
