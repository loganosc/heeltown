-- Update RLS policies to allow any authenticated user instead of just admins

-- Drop existing admin-only policies
DROP POLICY IF EXISTS "Admins can insert merchant attributes" ON public.merchant_attributes_junction;
DROP POLICY IF EXISTS "Admins can delete merchant attributes" ON public.merchant_attributes_junction;
DROP POLICY IF EXISTS "Admins can insert merchants" ON public.merchants;
DROP POLICY IF EXISTS "Admins can delete merchants" ON public.merchants;

-- Create new policies for authenticated users
CREATE POLICY "Authenticated users can insert merchant attributes"
ON public.merchant_attributes_junction
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete merchant attributes"
ON public.merchant_attributes_junction
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert merchants"
ON public.merchants
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete merchants"
ON public.merchants
FOR DELETE
TO authenticated
USING (true);