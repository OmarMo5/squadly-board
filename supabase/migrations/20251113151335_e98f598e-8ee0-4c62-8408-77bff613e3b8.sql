-- Drop existing foreign key if it exists (ignore error if it doesn't)
ALTER TABLE public.task_assignments DROP CONSTRAINT IF EXISTS task_assignments_user_id_fkey;

-- Add the correct foreign key relationship to profiles table
ALTER TABLE public.task_assignments
ADD CONSTRAINT task_assignments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON public.task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id);