-- The uploaded prescription slip, kept so the shop can check the powers
-- against the document before cutting lenses.
--
-- The key is stored rather than derived, for two reasons: re-uploading the
-- same file reuses the one object instead of writing another copy, and the
-- key itself can therefore be random. Random matters - the bucket is served
-- from a public read URL, so an object's only protection from a stranger is
-- that its name cannot be guessed. Nothing ever emits that URL: the file is
-- served through an authenticated route that streams it.

ALTER TABLE "prescription_extractions" ADD COLUMN "storedFile" TEXT;
