import { verifyFastRedactMigrationMatrix } from './fast-redact-migration.ts'

const verifiedRows = verifyFastRedactMigrationMatrix()

console.log(`Verified ${verifiedRows.length} fast-redact migration rows.`)
