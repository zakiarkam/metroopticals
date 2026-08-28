-- Sessions die with the password.
--
-- Logins are JSON web tokens that live for thirty days on their own. Until
-- now, changing or resetting a password did nothing to a session that had
-- already been issued  which is the one moment a person most needs every
-- other session gone. The auth callback now refuses any token issued before
-- this timestamp.
ALTER TABLE "users" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
