// Prints the migration prompt with the default settings: `npm run migration`.
// `npm run migration > MIGRATION.md` writes the copy kept in the repository.
import { migrationPrompt } from "../src/index.ts";

process.stdout.write(migrationPrompt());
