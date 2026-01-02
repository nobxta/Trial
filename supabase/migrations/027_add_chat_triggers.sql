-- DEPRECATED: merged into 000_final_schema.sql
-- Trigger to update last_message_at when a message is inserted
CREATE OR REPLACE FUNCTION update_dispute_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE disputes
    SET last_message_at = NEW.created_at
    WHERE id = NEW.dispute_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dispute_last_message
AFTER INSERT ON dispute_messages
FOR EACH ROW
EXECUTE FUNCTION update_dispute_last_message();

-- Trigger to update session last_active_at
CREATE OR REPLACE FUNCTION update_session_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE dispute_sessions
    SET last_active_at = NOW()
    WHERE chat_id = NEW.chat_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;




