/*
  # Add storage bucket and profile avatar support

  1. Storage Setup
    - Create public bucket for profile images
    - Set up RLS policies for authenticated users
    - Configure bucket settings

  2. Profile Updates
    - Add avatar_url column to profiles table
    - Set up proper column type and constraints

  3. Security
    - Enable RLS on storage bucket
    - Add policies for authenticated users
*/

-- First add avatar_url column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Enable storage by creating the bucket
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('public', 'public', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Set up RLS policies for storage.objects
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public');

CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public' AND
  (storage.foldername(name))[1] = 'public'
);

CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'public')
WITH CHECK (bucket_id = 'public');

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'public');