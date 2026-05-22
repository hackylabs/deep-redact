import { verifyV3MigrationMatrix } from './v3-migration.ts'

const verifiedRows = verifyV3MigrationMatrix()

console.log(`Verified ${verifiedRows.length} v3 migration rows.`)
