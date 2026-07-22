-- Add implemented field to roadmap_items table
ALTER TABLE public.roadmap_items 
ADD COLUMN implemented BOOLEAN NOT NULL DEFAULT false;