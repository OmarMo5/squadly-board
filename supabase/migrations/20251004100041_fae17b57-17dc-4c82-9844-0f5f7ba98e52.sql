-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
);

-- Storage policies for task attachments
CREATE POLICY "Users can upload task attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view task attachments they have access to"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-attachments' AND
  (
    -- Users can see their own uploads
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Admins and managers can see all
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'manager')
  )
);

CREATE POLICY "Users can delete their own task attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-attachments' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    has_role(auth.uid(), 'admin')
  )
);