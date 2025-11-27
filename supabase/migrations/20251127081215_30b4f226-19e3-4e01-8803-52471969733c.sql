-- Add profile picture URL to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Create profile-pictures storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures', 
  'profile-pictures', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile pictures
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can upload their own profile picture"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile picture"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile picture"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add more notification types if needed (table already exists)
-- Ensure departments table has description field (already exists based on schema)

-- Create a view for file management that combines task attachments
CREATE OR REPLACE VIEW public.all_files AS
SELECT 
  ta.id,
  ta.file_name,
  ta.file_path,
  ta.file_size,
  ta.created_at as uploaded_at,
  ta.uploaded_by,
  p.full_name as uploader_name,
  p.email as uploader_email,
  'task_attachment' as file_type,
  ta.task_id as related_id,
  t.title as related_name
FROM public.task_attachments ta
LEFT JOIN public.profiles p ON p.id = ta.uploaded_by
LEFT JOIN public.tasks t ON t.id = ta.task_id
WHERE ta.file_path IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON public.all_files TO authenticated;

-- Update departments table to ensure it has proper structure for management
-- (Already has id, name, description, created_at based on schema)

-- Add index for better performance on file queries
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON public.task_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);