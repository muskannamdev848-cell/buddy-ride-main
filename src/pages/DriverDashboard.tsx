import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Award, TrendingUp, Star, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";

interface DriverStats {
  total_rides: number;
  total_earnings: number;
  rating_average: number;
  level: number;
  experience_points: number;
  streak_days: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface EarnedBadge {
  badge_id: string;
  badges: Badge;
}

const DriverDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [availableBadges, setAvailableBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchDriverData = async () => {
      // Fetch driver stats
      const { data: statsData, error: statsError } = await supabase
        .from("driver_stats")
        .select("*")
        .eq("driver_id", user.id)
        .single();

      if (statsError) {
        console.error("Error fetching stats:", statsError);
      } else {
        setStats(statsData);
      }

      // Fetch earned badges
      const { data: earnedData, error: earnedError } = await supabase
        .from("driver_badges")
        .select(`
          badge_id,
          badges (
            id,
            name,
            description,
            icon
          )
        `)
        .eq("driver_id", user.id);

      if (!earnedError && earnedData) {
        setEarnedBadges(earnedData);
      }

      // Fetch all available badges
      const { data: badgesData, error: badgesError } = await supabase
        .from("badges")
        .select("*");

      if (!badgesError && badgesData) {
        setAvailableBadges(badgesData);
      }

      setLoading(false);
    };

    fetchDriverData();
    
    // Check for active rides
    const checkActiveRide = async () => {
      const { data: activeRide } = await supabase
        .from("rides")
        .select("id")
        .eq("driver_id", user.id)
        .in("status", ["accepted", "started"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (activeRide) {
        setActiveRideId(activeRide.id);
      }
    };
    
    checkActiveRide();
  }, [user, navigate]);

  const nextLevelXP = (stats?.level || 1) * 1000;
  const xpProgress = ((stats?.experience_points || 0) / nextLevelXP) * 100;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary-light/10 to-accent-light/10">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading your dashboard... ✨</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent-light/10 to-primary-light/10 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>

        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
            Driver Dashboard ⭐
          </h1>
          <p className="text-muted-foreground mt-1">
            You're doing amazing! Keep up the great work! 🚀
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Rides
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats?.total_rides || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Keep it rolling! 🚗</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/5 to-success/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                ${stats?.total_earnings?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">You're earning! 💰</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/5 to-warning/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-bold text-warning">
                  {stats?.rating_average?.toFixed(1) || "5.0"}
                </div>
                <Star className="w-6 h-6 text-warning fill-warning" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Excellent service! ⭐</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/5 to-accent/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Day Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-bold text-accent">
                  {stats?.streak_days || 0}
                </div>
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">On fire! 🔥</p>
            </CardContent>
          </Card>
        </div>

        {/* Level Progress */}
        <Card className="border-primary/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Level {stats?.level || 1}
              </CardTitle>
              <Badge variant="secondary" className="text-sm">
                {stats?.experience_points || 0} / {nextLevelXP} XP
              </Badge>
            </div>
            <CardDescription>
              Keep driving to level up and unlock more rewards! 🌟
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={xpProgress} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {nextLevelXP - (stats?.experience_points || 0)} XP to next level!
            </p>
          </CardContent>
        </Card>

        {/* Earned Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-accent" />
              Your Badges 🏆
            </CardTitle>
            <CardDescription>
              {earnedBadges.length === 0
                ? "Start earning badges by completing rides! 💪"
                : `You've earned ${earnedBadges.length} badge${earnedBadges.length > 1 ? "s" : ""}! Amazing work!`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {earnedBadges.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-4">
                {earnedBadges.map((earned) => (
                  <Card key={earned.badge_id} className="bg-gradient-to-br from-accent/5 to-primary/5">
                    <CardHeader className="pb-3">
                      <div className="text-4xl mb-2">{earned.badges.icon}</div>
                      <CardTitle className="text-base">{earned.badges.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{earned.badges.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 space-y-2">
                <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Complete rides to earn your first badge!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Badges to Earn */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Badges to Earn
            </CardTitle>
            <CardDescription>
              Check out what you can unlock next! 🎯
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {availableBadges
                .filter((badge) => !earnedBadges.find((e) => e.badge_id === badge.id))
                .map((badge) => (
                  <Card key={badge.id} className="bg-muted/50 opacity-75">
                    <CardHeader className="pb-3">
                      <div className="text-4xl mb-2 grayscale">{badge.icon}</div>
                      <CardTitle className="text-base">{badge.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{badge.description}</p>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Encouragement Card */}
        <Card className="border-success/50 bg-gradient-to-br from-success/5 to-primary/5">
          <CardContent className="pt-6">
            <p className="text-center text-lg font-medium">
              🌟 Congratulations on being part of our amazing driver community! 
              Every ride you complete makes someone's day better. You're a superstar! 🌟
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverDashboard;