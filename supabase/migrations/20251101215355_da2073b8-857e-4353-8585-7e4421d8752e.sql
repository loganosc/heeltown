
-- Add order column to specials_tags table
ALTER TABLE specials_tags 
ADD COLUMN display_order integer NOT NULL DEFAULT 0;

-- Set some initial order values for existing tags
UPDATE specials_tags 
SET display_order = 1 
WHERE name = 'Live Music';

UPDATE specials_tags 
SET display_order = 2 
WHERE name = 'Karaoke';

UPDATE specials_tags 
SET display_order = 3 
WHERE name = 'Trivia Night';

-- Add order column to activities_tags table as well for consistency
ALTER TABLE activities_tags 
ADD COLUMN display_order integer NOT NULL DEFAULT 0;

-- Set some initial order values for existing activity tags
UPDATE activities_tags 
SET display_order = 1 
WHERE name = 'Live Music';

UPDATE activities_tags 
SET display_order = 2 
WHERE name = 'Karaoke';

UPDATE activities_tags 
SET display_order = 3 
WHERE name = 'Trivia Night';

-- Add order column to merchant_attributes table as well
ALTER TABLE merchant_attributes 
ADD COLUMN display_order integer NOT NULL DEFAULT 0;

-- Set some initial order values
UPDATE merchant_attributes 
SET display_order = 1 
WHERE name = 'Pool Table';

UPDATE merchant_attributes 
SET display_order = 2 
WHERE name = 'Vegetarian';

UPDATE merchant_attributes 
SET display_order = 3 
WHERE name = 'Outdoor Seating';
