-- Migration: Add start_date and end_date fields to projects table
-- Created: $(date)

-- Add start_date and end_date columns to projects table
ALTER TABLE projects 
ADD COLUMN start_date TIMESTAMP NULL,
ADD COLUMN end_date TIMESTAMP NULL;

-- Add indexes for better query performance
CREATE INDEX idx_projects_start_date ON projects(start_date);
CREATE INDEX idx_projects_end_date ON projects(end_date);
CREATE INDEX idx_projects_date_range ON projects(start_date, end_date);

-- Add comments for documentation
COMMENT ON COLUMN projects.start_date IS 'Project start date';
COMMENT ON COLUMN projects.end_date IS 'Project end date (can be null for ongoing projects)';

-- Optional: Add a constraint to ensure end_date is after start_date when both are set
ALTER TABLE projects 
ADD CONSTRAINT chk_project_dates 
CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);