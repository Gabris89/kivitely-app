-- Add a longer free-text note field to plan_measurements, separate from the
-- short label (e.g. label = "Konyha", note = "Padlófűtés miatt kétszer kell felmérni").
alter table plan_measurements add column if not exists note text;
