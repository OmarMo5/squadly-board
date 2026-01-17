-- Create a security definer function to get user's department without recursion
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id uuid)
RETURNS department_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- Create a function to check if user is assigned to a task
CREATE OR REPLACE FUNCTION public.is_assigned_to_task(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.task_assignments
    WHERE user_id = _user_id AND task_id = _task_id
  )
$$;

-- Drop and recreate the SELECT policy to avoid recursion
DROP POLICY IF EXISTS "Users can view tasks in their department or assigned to them" ON public.tasks;

CREATE POLICY "Users can view tasks in their department or assigned to them"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  (deleted_at IS NULL AND (
    department = public.get_user_department(auth.uid())
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  ))
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);

-- Drop and recreate the UPDATE policy to avoid recursion
DROP POLICY IF EXISTS "Users can update their own tasks or assigned tasks" ON public.tasks;

CREATE POLICY "Users can update their own tasks or assigned tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR public.is_assigned_to_task(auth.uid(), id)
)
WITH CHECK (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR public.is_assigned_to_task(auth.uid(), id)
);