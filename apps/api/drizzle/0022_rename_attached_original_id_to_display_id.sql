-- Rename attached_original_id to attached_display_id in team_attachments table
ALTER TABLE team_attachments RENAME COLUMN attached_original_id TO attached_display_id;
