-- Allow authenticated users to update merchants table
CREATE POLICY "Authenticated users can update merchants"
ON public.merchants
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);