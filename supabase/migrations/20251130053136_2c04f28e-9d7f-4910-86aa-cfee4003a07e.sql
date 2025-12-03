-- Create ride_locations table for real-time GPS tracking
CREATE TABLE public.ride_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('passenger', 'driver')),
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  heading numeric,
  speed numeric,
  accuracy numeric,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ride_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for ride participants to view and update locations
CREATE POLICY "Ride participants can view locations"
ON public.ride_locations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rides
    WHERE rides.id = ride_locations.ride_id
    AND (rides.passenger_id = auth.uid() OR rides.driver_id = auth.uid())
  )
);

CREATE POLICY "Users can insert own locations"
ON public.ride_locations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_ride_locations_ride_id ON public.ride_locations(ride_id);
CREATE INDEX idx_ride_locations_timestamp ON public.ride_locations(timestamp DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_locations;