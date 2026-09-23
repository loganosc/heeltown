-- Add location and hours columns to merchants table
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS hours JSONB DEFAULT '{
  "monday": {"open": "09:00", "close": "17:00", "closed": false},
  "tuesday": {"open": "09:00", "close": "17:00", "closed": false},
  "wednesday": {"open": "09:00", "close": "17:00", "closed": false},
  "thursday": {"open": "09:00", "close": "17:00", "closed": false},
  "friday": {"open": "09:00", "close": "17:00", "closed": false},
  "saturday": {"open": "10:00", "close": "16:00", "closed": false},
  "sunday": {"open": "10:00", "close": "16:00", "closed": false}
}'::jsonb;

COMMENT ON COLUMN public.merchants.location IS 'Physical address or location description';
COMMENT ON COLUMN public.merchants.hours IS 'Operating hours by day of week in JSON format';