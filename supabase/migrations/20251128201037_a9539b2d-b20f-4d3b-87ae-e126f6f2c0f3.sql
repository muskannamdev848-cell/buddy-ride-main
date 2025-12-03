-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('passenger', 'driver', 'admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create safety definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- Create rides table
CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  pickup_lat DECIMAL(10, 8),
  pickup_lng DECIMAL(11, 8),
  dropoff_lat DECIMAL(10, 8),
  dropoff_lng DECIMAL(11, 8),
  status TEXT DEFAULT 'pending',
  ride_type TEXT DEFAULT 'standard',
  base_price DECIMAL(10, 2),
  surge_multiplier DECIMAL(3, 2) DEFAULT 1.0,
  final_price DECIMAL(10, 2),
  distance_km DECIMAL(6, 2),
  estimated_duration INT,
  scheduled_time TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create driver stats table for gamification
CREATE TABLE public.driver_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_rides INT DEFAULT 0,
  total_earnings DECIMAL(12, 2) DEFAULT 0,
  rating_average DECIMAL(3, 2) DEFAULT 5.0,
  rating_count INT DEFAULT 0,
  level INT DEFAULT 1,
  experience_points INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  last_ride_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create badges table
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value INT NOT NULL,
  points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create driver badges junction table
CREATE TABLE public.driver_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id, badge_id)
);

-- Create safety zones table
CREATE TABLE public.safety_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_name TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  radius_km DECIMAL(6, 2) NOT NULL,
  safety_score TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_zones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for rides
CREATE POLICY "Passengers can view own rides"
  ON public.rides FOR SELECT
  USING (auth.uid() = passenger_id OR auth.uid() = driver_id);

CREATE POLICY "Passengers can create rides"
  ON public.rides FOR INSERT
  WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Drivers can update assigned rides"
  ON public.rides FOR UPDATE
  USING (auth.uid() = driver_id OR auth.uid() = passenger_id);

-- RLS Policies for driver_stats
CREATE POLICY "Anyone can view driver stats"
  ON public.driver_stats FOR SELECT
  USING (true);

CREATE POLICY "Drivers can update own stats"
  ON public.driver_stats FOR UPDATE
  USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can insert own stats"
  ON public.driver_stats FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

-- RLS Policies for badges
CREATE POLICY "Anyone can view badges"
  ON public.badges FOR SELECT
  USING (true);

-- RLS Policies for driver_badges
CREATE POLICY "Anyone can view earned badges"
  ON public.driver_badges FOR SELECT
  USING (true);

CREATE POLICY "Drivers can insert own badges"
  ON public.driver_badges FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

-- RLS Policies for safety_zones
CREATE POLICY "Anyone can view safety zones"
  ON public.safety_zones FOR SELECT
  USING (true);

-- Create trigger function to update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_rides_updated_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_driver_stats_updated_at
  BEFORE UPDATE ON public.driver_stats
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert initial badges
INSERT INTO public.badges (name, description, icon, requirement_type, requirement_value, points) VALUES
  ('Early Bird', 'Complete 5 rides before 7 AM', '🌅', 'early_rides', 5, 50),
  ('Night Owl', 'Complete 5 rides after 10 PM', '🦉', 'night_rides', 5, 50),
  ('Century Club', 'Complete 100 rides', '💯', 'total_rides', 100, 200),
  ('Five Star Hero', 'Maintain 5.0 rating for 20 rides', '⭐', 'perfect_rating', 20, 150),
  ('Speed Demon', 'Complete 10 rides in one day', '⚡', 'daily_rides', 10, 100),
  ('Friendly Driver', 'Receive 50 compliments', '💖', 'compliments', 50, 100);

-- Insert sample safety zones
INSERT INTO public.safety_zones (area_name, lat, lng, radius_km, safety_score) VALUES
  ('Downtown District', 40.7128, -74.0060, 2.0, 'High'),
  ('Business Park', 40.7489, -73.9680, 1.5, 'High'),
  ('Residential Area North', 40.7831, -73.9712, 3.0, 'Moderate'),
  ('Shopping District', 40.7614, -73.9776, 1.0, 'High'),
  ('Industrial Zone', 40.6782, -73.9442, 2.5, 'Moderate');

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.phone
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();