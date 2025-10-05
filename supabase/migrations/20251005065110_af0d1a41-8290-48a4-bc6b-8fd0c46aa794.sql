-- Create permissions table to store available permissions
CREATE TABLE public.permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  category text NOT NULL DEFAULT 'general',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on permissions
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Create role_permissions table to map permissions to roles
CREATE TABLE public.role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role app_role NOT NULL,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- Enable RLS on role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Insert default permissions
INSERT INTO public.permissions (name, description, category) VALUES
  ('create_task', 'Create new tasks', 'tasks'),
  ('edit_task', 'Edit existing tasks', 'tasks'),
  ('delete_task', 'Delete tasks', 'tasks'),
  ('view_all_tasks', 'View all tasks across departments', 'tasks'),
  ('assign_task', 'Assign tasks to users', 'tasks'),
  ('manage_users', 'Create, edit, and delete users', 'users'),
  ('manage_roles', 'Assign and modify user roles', 'users'),
  ('view_users', 'View all users in the system', 'users'),
  ('manage_departments', 'Create and manage departments', 'departments'),
  ('view_reports', 'Access reporting and analytics', 'reports');

-- Assign default permissions to roles
-- Admin gets all permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::app_role, id FROM public.permissions;

-- Manager gets most permissions except user/role management
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'manager'::app_role, id FROM public.permissions 
WHERE name IN ('create_task', 'edit_task', 'delete_task', 'view_all_tasks', 'assign_task', 'view_users', 'view_reports');

-- Employee gets basic permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'employee'::app_role, id FROM public.permissions 
WHERE name IN ('create_task', 'edit_task');

-- RLS Policies for permissions table
CREATE POLICY "Anyone can view permissions"
ON public.permissions
FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage permissions"
ON public.permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for role_permissions table
CREATE POLICY "Anyone can view role permissions"
ON public.role_permissions
FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage role permissions"
ON public.role_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id AND p.name = _permission_name
  )
$$;