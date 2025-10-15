-- Create task_assignments junction table for multiple assignees
CREATE TABLE public.task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- Create task_completions table to track individual user completions
CREATE TABLE public.task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- Enable RLS
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_assignments
CREATE POLICY "Users can view task assignments they're part of"
  ON public.task_assignments FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_assignments.task_id
      AND (
        tasks.created_by = auth.uid() OR
        has_role(auth.uid(), 'admin') OR
        has_role(auth.uid(), 'manager')
      )
    )
  );

CREATE POLICY "Task creators and admins can create assignments"
  ON public.task_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_assignments.task_id
      AND (
        tasks.created_by = auth.uid() OR
        has_role(auth.uid(), 'admin') OR
        has_role(auth.uid(), 'manager')
      )
    )
  );

CREATE POLICY "Task creators and admins can delete assignments"
  ON public.task_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_assignments.task_id
      AND (
        tasks.created_by = auth.uid() OR
        has_role(auth.uid(), 'admin')
      )
    )
  );

-- RLS Policies for task_completions
CREATE POLICY "Users can view completions for tasks they're assigned to"
  ON public.task_completions FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_completions.task_id
      AND (
        tasks.created_by = auth.uid() OR
        has_role(auth.uid(), 'admin') OR
        has_role(auth.uid(), 'manager')
      )
    )
  );

CREATE POLICY "Assigned users can mark tasks complete"
  ON public.task_completions FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.task_assignments
      WHERE task_assignments.task_id = task_completions.task_id
      AND task_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own completions"
  ON public.task_completions FOR DELETE
  USING (user_id = auth.uid());

-- Update notify_task_assignment function to handle multiple assignees
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_record RECORD;
  task_creator_name TEXT;
  assigned_user_record RECORD;
BEGIN
  -- Get creator name
  SELECT full_name INTO task_creator_name
  FROM public.profiles
  WHERE id = NEW.created_by;

  -- Notify all assigned users
  FOR assigned_user_record IN 
    SELECT DISTINCT ta.user_id
    FROM public.task_assignments ta
    WHERE ta.task_id = NEW.id AND ta.user_id != NEW.created_by
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, related_task_id)
    VALUES (
      assigned_user_record.user_id,
      'New Task Assigned',
      'You have been assigned to task: ' || NEW.title || ' by ' || COALESCE(task_creator_name, 'a user'),
      'task_assigned',
      NEW.id
    );
  END LOOP;

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
$$;

-- Create function to notify task creator when someone completes their part
CREATE OR REPLACE FUNCTION public.notify_task_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record RECORD;
  completer_name TEXT;
BEGIN
  -- Get task details and creator
  SELECT t.*, p.full_name as completer_full_name
  INTO task_record
  FROM public.tasks t
  JOIN public.profiles p ON p.id = NEW.user_id
  WHERE t.id = NEW.task_id;

  -- Notify task creator if different from completer
  IF task_record.created_by != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_task_id)
    VALUES (
      task_record.created_by,
      'Task Completed',
      task_record.completer_full_name || ' has completed their part of task: ' || task_record.title,
      'task_completed',
      NEW.task_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for task completion notifications
CREATE TRIGGER on_task_completion
  AFTER INSERT ON public.task_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_completion();