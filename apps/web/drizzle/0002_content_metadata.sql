ALTER TABLE drafts ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE drafts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE audit_logs ADD COLUMN request_id TEXT;
CREATE INDEX IF NOT EXISTS idx_audit_request ON audit_logs(request_id);
