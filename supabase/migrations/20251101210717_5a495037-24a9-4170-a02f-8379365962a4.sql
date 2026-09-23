-- Create merchants table
CREATE TABLE public.merchants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cover_photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create merchant_attributes table
CREATE TABLE public.merchant_attributes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for merchants and attributes (many-to-many)
CREATE TABLE public.merchant_attributes_junction (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES public.merchant_attributes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(merchant_id, attribute_id)
);

-- Create specials table
CREATE TABLE public.specials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  price DECIMAL(10, 2) NOT NULL,
  schedule JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activities table
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  schedule JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create specials_tags table
CREATE TABLE public.specials_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activities_tags table
CREATE TABLE public.activities_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for specials and tags (many-to-many)
CREATE TABLE public.specials_tags_junction (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  special_id UUID NOT NULL REFERENCES public.specials(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.specials_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(special_id, tag_id)
);

-- Create junction table for activities and tags (many-to-many)
CREATE TABLE public.activities_tags_junction (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.activities_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(activity_id, tag_id)
);

-- Enable Row Level Security
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_attributes_junction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specials_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specials_tags_junction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities_tags_junction ENABLE ROW LEVEL SECURITY;

-- Create public read policies (since this is a public-facing discovery app)
CREATE POLICY "Anyone can view merchants" ON public.merchants FOR SELECT USING (true);
CREATE POLICY "Anyone can view merchant_attributes" ON public.merchant_attributes FOR SELECT USING (true);
CREATE POLICY "Anyone can view merchant_attributes_junction" ON public.merchant_attributes_junction FOR SELECT USING (true);
CREATE POLICY "Anyone can view specials" ON public.specials FOR SELECT USING (true);
CREATE POLICY "Anyone can view activities" ON public.activities FOR SELECT USING (true);
CREATE POLICY "Anyone can view specials_tags" ON public.specials_tags FOR SELECT USING (true);
CREATE POLICY "Anyone can view activities_tags" ON public.activities_tags FOR SELECT USING (true);
CREATE POLICY "Anyone can view specials_tags_junction" ON public.specials_tags_junction FOR SELECT USING (true);
CREATE POLICY "Anyone can view activities_tags_junction" ON public.activities_tags_junction FOR SELECT USING (true);

-- Create indexes for better query performance
CREATE INDEX idx_merchant_attributes_junction_merchant ON public.merchant_attributes_junction(merchant_id);
CREATE INDEX idx_merchant_attributes_junction_attribute ON public.merchant_attributes_junction(attribute_id);
CREATE INDEX idx_specials_merchant ON public.specials(merchant_id);
CREATE INDEX idx_activities_merchant ON public.activities(merchant_id);
CREATE INDEX idx_specials_tags_junction_special ON public.specials_tags_junction(special_id);
CREATE INDEX idx_specials_tags_junction_tag ON public.specials_tags_junction(tag_id);
CREATE INDEX idx_activities_tags_junction_activity ON public.activities_tags_junction(activity_id);
CREATE INDEX idx_activities_tags_junction_tag ON public.activities_tags_junction(tag_id);