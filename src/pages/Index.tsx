import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Copy, MapPin, Users } from "lucide-react";
import AdminDashboard from "@/components/AdminDashboard";

const Index = () => {
  const [sessionName, setSessionName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createTrackingSession = async () => {
    if (!sessionName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session name",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tracking_sessions')
        .insert({
          session_name: sessionName,
          admin_email: adminEmail || null,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(data.id);
      toast({
        title: "Session Created",
        description: "Your tracking session has been created successfully!",
      });
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create tracking session",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyTrackingLink = () => {
    if (!currentSession) return;
    
    const trackingUrl = `${window.location.origin}/track/${currentSession}`;
    navigator.clipboard.writeText(trackingUrl);
    toast({
      title: "Link Copied",
      description: "Tracking link has been copied to your clipboard",
    });
  };

  const viewDashboard = () => {
    if (!currentSession) return;
    window.open(`${window.location.origin}/dashboard/${currentSession}`, '_blank');
  };

  if (currentSession) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="text-center">
            <h1 className="mb-2 text-3xl font-bold text-foreground">Tracking Session Created</h1>
            <p className="text-muted-foreground">Share the link below to start tracking locations</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Session: {sessionName}
              </CardTitle>
              <CardDescription>
                Session ID: {currentSession}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={`${window.location.origin}/track/${currentSession}`}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button onClick={copyTrackingLink} variant="outline">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={viewDashboard} className="flex-1">
                  <Users className="mr-2 h-4 w-4" />
                  View Dashboard
                </Button>
                <Button onClick={() => setCurrentSession(null)} variant="outline">
                  New Session
                </Button>
              </div>
            </CardContent>
          </Card>

          <AdminDashboard sessionId={currentSession} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold text-foreground">Location Tracker</h1>
          <p className="text-muted-foreground">Create a tracking session to monitor locations in real-time</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Tracking Session</CardTitle>
            <CardDescription>
              Start a new session to track people or objects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="sessionName" className="text-sm font-medium text-foreground">
                Session Name *
              </label>
              <Input
                id="sessionName"
                placeholder="e.g., Field Trip 2024"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="adminEmail" className="text-sm font-medium text-foreground">
                Admin Email (optional)
              </label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="admin@example.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>

            <Button 
              onClick={createTrackingSession} 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create Session"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;