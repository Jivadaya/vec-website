-- SMART SEARCH FUNCTION
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.search_students(term TEXT)
RETURNS SETOF public.students
LANGUAGE sql
STABLE
SECURITY INVOKER -- Respects RLS policies (User only sees what they are allowed to see)
AS $$
  SELECT *
  FROM public.students
  WHERE
    "Name of Student" ILIKE '%' || term || '%'
    OR "VEC Exam Code" ILIKE '%' || term || '%'
    OR CAST("Mobile Number" AS TEXT) ILIKE '%' || term || '%';
$$;
