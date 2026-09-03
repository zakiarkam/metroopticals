-- What the prescriber said to make.
--
-- Doctors write it on the slip — "Bifocals", "PAL", "SV" — and it is the one
-- question a customer often cannot answer for themselves. A reading addition
-- alone does not settle it: the same +2.25 ADD could be a bifocal, a
-- progressive, or a separate pair of reading glasses.
--
-- Nullable, and null is a normal state rather than missing data: it means
-- nobody has said, and the picker explains the choice instead of guessing.

ALTER TABLE "prescriptions" ADD COLUMN "prescribedDesign" "LensDesignKind";
