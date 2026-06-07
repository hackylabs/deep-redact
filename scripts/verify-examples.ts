import { verifyExampleManifest } from './example-validation.ts'

const verifiedRows = await verifyExampleManifest()

console.log(`Verified ${verifiedRows.length} example rows.`)
