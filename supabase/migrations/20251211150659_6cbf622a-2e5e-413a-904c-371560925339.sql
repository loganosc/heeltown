-- Update merchants table RLS policies to only allow admins to modify merchants
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert merchants" ON public.merchants;
DROP POLICY IF EXISTS "Authenticated users can update merchants" ON public.merchants;
DROP POLICY IF EXISTS "Authenticated users can delete merchants" ON public.merchants;

-- Create new admin-only policies using the existing has_role function
CREATE POLICY "Admins can insert merchants" 
ON public.merchants 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update merchants" 
ON public.merchants 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete merchants" 
ON public.merchants 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Also restrict merchant_attributes_junction modifications to admins only
DROP POLICY IF EXISTS "Authenticated users can insert merchant attributes" ON public.merchant_attributes_junction;
DROP POLICY IF EXISTS "Authenticated users can delete merchant attributes" ON public.merchant_attributes_junction;

CREATE POLICY "Admins can insert merchant attributes" 
ON public.merchant_attributes_junction 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete merchant attributes" 
ON public.merchant_attributes_junction 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));