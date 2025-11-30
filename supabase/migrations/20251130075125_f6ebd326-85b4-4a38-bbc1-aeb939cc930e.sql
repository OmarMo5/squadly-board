-- Create trigger to notify users when tasks are created
CREATE TRIGGER on_task_created
  AFTER INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assignment();

-- Create trigger to notify users when they are assigned to tasks
CREATE OR REPLACE FUNCTION public.notify_task_assignment_on_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record RECORD;
  task_creator_name TEXT;
BEGIN
  -- Get task details and creator name
  SELECT t.*, p.full_name as creator_full_name
  INTO task_record
  FROM public.tasks t
  JOIN public.profiles p ON p.id = t.created_by
  WHERE t.id = NEW.task_id;

  -- Notify the assigned user if they're not the creator
  IF NEW.user_id != task_record.created_by THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_task_id)
    VALUES (
      NEW.user_id,
      'New Task Assigned',
      'You have been assigned to task: ' || task_record.title || ' by ' || COALESCE(task_record.creator_full_name, 'a user'),
      'task_assigned',
      NEW.task_id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_assignment_created
  AFTER INSERT ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assignment_on_assignment();