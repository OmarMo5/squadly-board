-- Fix task_attachments SELECT policy to avoid recursion
DROP POLICY IF EXISTS "Users can view attachments on tasks they can see" ON public.task_attachments;

CREATE POLICY "Users can view attachments on tasks they can see"
ON public.task_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE tasks.id = task_attachments.task_id
    AND (
      tasks.department = public.get_user_department(auth.uid())
      OR tasks.assigned_to = auth.uid()
      OR tasks.created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'manager')
    )
  )
);

-- Fix task_comments SELECT policy to avoid recursion
DROP POLICY IF EXISTS "Users can view comments on tasks they can see" ON public.task_comments;

CREATE POLICY "Users can view comments on tasks they can see"
ON public.task_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE tasks.id = task_comments.task_id
    AND (
      tasks.department = public.get_user_department(auth.uid())
      OR tasks.assigned_to = auth.uid()
      OR tasks.created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'manager')
    )
  )
);