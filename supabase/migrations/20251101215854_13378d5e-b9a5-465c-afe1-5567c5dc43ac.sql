
-- Create storage bucket for special images
INSERT INTO storage.buckets (id, name, public)
VALUES ('special-images', 'special-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the bucket
CREATE POLICY "Anyone can view special images"
ON storage.objects FOR SELECT
USING (bucket_id = 'special-images');

CREATE POLICY "Authenticated users can upload special images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'special-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update special images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'special-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete special images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'special-images' 
  AND auth.role() = 'authenticated'
);

-- Create storage bucket for activity images
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-images', 'activity-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for activity images bucket
CREATE POLICY "Anyone can view activity images"
ON storage.objects FOR SELECT
USING (bucket_id = 'activity-images');

CREATE POLICY "Authenticated users can upload activity images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'activity-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update activity images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'activity-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete activity images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'activity-images' 
  AND auth.role() = 'authenticated'
);

-- Create storage bucket for merchant images
INSERT INTO storage.buckets (id, name, public)
VALUES ('merchant-images', 'merchant-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for merchant images bucket
CREATE POLICY "Anyone can view merchant images"
ON storage.objects FOR SELECT
USING (bucket_id = 'merchant-images');

CREATE POLICY "Authenticated users can upload merchant images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'merchant-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update merchant images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'merchant-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete merchant images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'merchant-images' 
  AND auth.role() = 'authenticated'
);
