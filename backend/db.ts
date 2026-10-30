/**
 * Backend Database Access Layer
 * Re-exports initialized SQLite connection from storage/db.ts
 */

import { getDb, closeDb } from "@/storage/db";

export { getDb, closeDb };
export default getDb;
