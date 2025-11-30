-- Fix security warning: Set search_path for the new function
CREATE OR REPLACE FUNCTION public.notify_task_assignment_on_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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