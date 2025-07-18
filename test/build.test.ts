import path from 'path'
import { describe, it, expect, beforeAll } from 'vitest'
import packageJson from '../package.json'

describe('Redaction Build Tests', () => {
  let esmFiles: string[] = []
  let cjsFiles: string[] = []

  beforeAll(() => {
    Object.values(packageJson.exports).forEach((file: any) => {
      if (typeof file !== 'object' || file === null) return
      if (file?.import?.startsWith('./dist/esm/')) esmFiles.push(path.relative(__dirname, file.import))
      if (file?.require?.startsWith('./dist/cjs/')) cjsFiles.push(path.relative(__dirname, file.require))
    })
  })

  describe('ESM', () => {
    it('should have the same number of files as the package.json exports', () => {
      expect(esmFiles.length).toBe(Object.keys(packageJson.exports).length)
    })

    it('can import the library', async () => {
      const module = await import(esmFiles[0])
      expect(esmFiles[0]).toEqual('../dist/esm/index.mjs')
      expect(module).toBeDefined()
    })
  })

  describe('CJS', () => {
    it('should have the same number of files as the package.json exports', () => {
      expect(cjsFiles.length).toBe(Object.keys(packageJson.exports).length)
    })

    it('can import the library', () => {
      const module = require(cjsFiles[0])
      expect(cjsFiles[0]).toEqual('../dist/cjs/index.js')
      expect(module).toBeDefined()
    })
  })
})