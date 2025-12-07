-- Ensure all profiles have a role in user_roles table (default to 'employee')
-- This fixes the RLS permission issues for users without roles
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'employee'::app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
)
ON CONFLICT DO NOTHING;