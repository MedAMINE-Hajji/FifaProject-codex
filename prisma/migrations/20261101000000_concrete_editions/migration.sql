-- Existing databases already have edition from partial work. No cohort is inferred here.
-- Apply only after inspecting the deployment's existing schema/migration history.
ALTER TABLE "Match" ALTER COLUMN "edition" DROP DEFAULT;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Match_concrete_edition_check' AND conrelid = '"Match"'::regclass
  ) THEN
    ALTER TABLE "Match" ADD CONSTRAINT "Match_concrete_edition_check"
      CHECK ("edition" IN ('FIFA_22', 'FIFA_23', 'FC_24', 'FC_25', 'FC_26', 'FC_27')) NOT VALID;
  END IF;
END $$;
-- NOT VALID preserves existing rows for review; all new/updated rows are checked.
-- Legacy repair is a separate explicit-ID operation, never a blanket UPDATE.
