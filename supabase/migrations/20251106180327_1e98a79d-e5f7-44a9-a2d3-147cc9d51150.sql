-- Add latitude and longitude columns to merchants table
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;

-- Add some sample coordinates for existing merchants (San Diego area)
-- You can update these with actual coordinates later
UPDATE public.merchants 
SET latitude = 32.7157 + (random() * 0.05 - 0.025),
    longitude = -117.1611 + (random() * 0.05 - 0.025)
WHERE latitude IS NULL;