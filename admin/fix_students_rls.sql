-- FIX Students Table RLS
-- Run this in Supabase SQL Editor

-- 1. Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (to ensure clean slate)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.students;
DROP POLICY IF EXISTS "Admins can insert" ON public.students;
DROP POLICY IF EXISTS "Admins can update" ON public.students;
DROP POLICY IF EXISTS "Admins can delete" ON public.students;
DROP POLICY IF EXISTS "District Admins manage own data" ON public.students;

-- 3. Create Policy: Super Admin & District Admin Access
-- This single policy covers SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "Admin Access Policy"
ON public.students
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (
      role = 'super_admin'
      OR (
        role = 'admin' 
        AND (
           -- Check if the student's district is inside the assigned_district string
           -- We use a robust LIKE check or strict equality if single.
           -- For multi-district CSV (e.g., "Jaipur, Kota"), we check if the district appears in the string.
           assigned_district LIKE '%' || students."District" || '%'
           OR assigned_district = 'ALL'
        )
      )
    )
  )
);

-- 4. Grant Permissions
GRANT ALL ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
