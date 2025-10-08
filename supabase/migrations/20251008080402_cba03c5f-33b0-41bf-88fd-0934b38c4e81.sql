-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  related_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

-- Add soft delete to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create function to notify assigned user and admins when task is created
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  task_creator_name TEXT;
BEGIN
  -- Get creator name
  SELECT full_name INTO task_creator_name
  FROM public.profiles
  WHERE id = NEW.created_by;

  -- Notify assigned user if different from creator
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != NEW.created_by THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_task_id)
    VALUES (
      NEW.assigned_to,
      'New Task Assigned',
      'You have been assigned a new task: ' || NEW.title || ' by ' || COALESCE(task_creator_name, 'a user'),
      'task_assigned',
      NEW.id
    );
  END IF;

  -- Notify all admins
  FOR admin_record IN 
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'admin' AND ur.user_id != NEW.created_by
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, related_task_id)
    VALUES (
      admin_record.user_id,
      'New Task Created',
      'A new task "' || NEW.title || '" was created by ' || COALESCE(task_creator_name, 'a user') || ' in ' || NEW.department::text,
      'task_created',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for task notifications
DROP TRIGGER IF EXISTS task_assignment_notification ON public.tasks;
CREATE TRIGGER task_assignment_notification
AFTER INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_assignment();

-- Update tasks RLS policy for admins to see deleted tasks
DROP POLICY IF EXISTS "Users can view tasks in their department or assigned to them" ON public.tasks;
CREATE POLICY "Users can view tasks in their department or assigned to them"
ON public.tasks
FOR SELECT
USING (
  (deleted_at IS NULL AND (
    department = (SELECT department FROM profiles WHERE id = auth.uid())
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  ))
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'manager')
);