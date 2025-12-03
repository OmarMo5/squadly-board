-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their own tasks or assigned tasks" ON public.tasks;

-- Create new UPDATE policy that includes task_assignments table check
CREATE POLICY "Users can update their own tasks or assigned tasks" 
ON public.tasks 
FOR UPDATE 
USING (
  (created_by = auth.uid()) 
  OR (assigned_to = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.task_assignments 
    WHERE task_assignments.task_id = tasks.id 
    AND task_assignments.user_id = auth.uid()
  )
);