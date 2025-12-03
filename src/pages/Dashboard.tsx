import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, User, Shield, LogOut, UserCircle, Award, Phone } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching roles:", error);
      } else {
        setRoles(data?.map((r) => r.role) || []);
      }
      setLoading(false);
    };

    fetchRoles();
  }, [user, navigate]);

  const addRole = async (role: "passenger" | "driver") => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role });

      if (error) throw error;

      setRoles([...roles, role]);
      
      if (role === "driver") {
        // Create driver stats
        await supabase.from("driver_stats").insert({ driver_id: user.id });
        toast.success("🎉 Welcome to the driver community! Let's hit the road!");
      } else {
        toast.success("✨ You're all set to book rides! Where to?");
      }
    } catch (error: any) {
      if (error.message?.includes("duplicate")) {
        toast.error("You already have this role! 😊");
      } else {
        toast.error("Oops! Something went wrong. Let's try again!");
      }
    }
  };

  const navigateToRole = (role: string) => {
    if (role === "passenger") {
      navigate("/passenger");
    } else if (role === "driver") {
      navigate("/driver");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary-light/10 to-accent-light/10">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Getting everything ready for you... ✨</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/10 to-accent-light/10 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Welcome Back! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Ready for your next adventure? Let's go!
            </p>
          </div>
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        {/* Role Selection */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="group hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/50">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                  <User className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl">Passenger</CardTitle>
              </div>
              <CardDescription className="text-base">
                Book rides and travel safely with our friendly drivers! 🚗
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roles.includes("passenger") ? (
                <Button
                  onClick={() => navigateToRole("passenger")}
                  className="w-full"
                  size="lg"
                >
                  Go to Passenger Dashboard
                </Button>
              ) : (
                <Button
                  onClick={() => addRole("passenger")}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Become a Passenger
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all cursor-pointer border-2 hover:border-accent/50">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-accent/10 rounded-xl group-hover:bg-accent group-hover:text-white transition-colors">
                  <Car className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl">Driver</CardTitle>
              </div>
              <CardDescription className="text-base">
                Earn money, help people, and climb the leaderboards! ⭐
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roles.includes("driver") ? (
                <Button
                  onClick={() => navigateToRole("driver")}
                  className="w-full"
                  size="lg"
                  variant="secondary"
                >
                  Go to Driver Dashboard
                </Button>
              ) : (
                <Button
                  onClick={() => addRole("driver")}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Become a Driver
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Your Roles */}
        {roles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Your Active Roles
              </CardTitle>
              <CardDescription>
                You're doing amazing! Here's what you can do:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {roles.map((role) => (
                  <Badge
                    key={role}
                    variant="secondary"
                    className="text-sm px-4 py-2 capitalize"
                  >
                    {role === "passenger" ? "🚗" : "⭐"} {role}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Emergency Contacts */}
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-destructive" />
              Emergency Contacts 🆘
            </CardTitle>
            <CardDescription>
              Set up your safety net. Add trusted contacts who'll be alerted if you need help!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate("/emergency-contacts")}
              variant="destructive"
              className="w-full"
            >
              Manage Emergency Contacts
            </Button>
          </CardContent>
        </Card>

        {/* Features Overview */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <Shield className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="text-lg">Safety First 🛡️</CardTitle>
              <CardDescription>
                Real-time tracking, SOS button, and safety scores for your peace of mind.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
            <CardHeader>
              <Award className="w-8 h-8 text-accent mb-2" />
              <CardTitle className="text-lg">Earn & Grow 🌟</CardTitle>
              <CardDescription>
                Drivers: Collect badges, level up, and compete on leaderboards!
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20">
            <CardHeader>
              <UserCircle className="w-8 h-8 text-success mb-2" />
              <CardTitle className="text-lg">Smart Rides 💡</CardTitle>
              <CardDescription>
                Save money with hybrid routes combining rides and public transport!
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;