-- Add RLS policies for admins to manage departments

-- Allow admins to insert departments
CREATE POLICY "Admins can create departments" 
ON public.departments 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update departments
CREATE POLICY "Admins can update departments" 
ON public.departments 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete departments
CREATE POLICY "Admins can delete departments" 
ON public.departments 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));