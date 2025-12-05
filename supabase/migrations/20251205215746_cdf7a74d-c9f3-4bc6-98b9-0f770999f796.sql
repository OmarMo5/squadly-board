-- Create trigger for task completion notifications
CREATE TRIGGER on_task_completion_notify
AFTER INSERT ON public.task_completions
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_completion();

-- Create trigger for task assignment notifications
CREATE TRIGGER on_task_assignment_notify
AFTER INSERT ON public.task_assignments
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_assignment_on_assignment();

-- Add UPDATE policy for task_assignments so creators can manage assignments
CREATE POLICY "Task creators and admins can update assignments"
ON public.task_assignments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_assignments.task_id
    AND (tasks.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);