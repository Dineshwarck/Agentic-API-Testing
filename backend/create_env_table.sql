-- Set schema to demo tenant
SET search_path TO demo;

-- Create core_environment table
CREATE TABLE IF NOT EXISTS core_environment (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    variables JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    project_id UUID NOT NULL REFERENCES core_project(id) ON DELETE CASCADE
);

-- Create index on project_id for faster queries
CREATE INDEX IF NOT EXISTS core_environment_project_id_idx ON core_environment(project_id);
