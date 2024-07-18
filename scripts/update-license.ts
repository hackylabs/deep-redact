#!/usr/bin/env ts-node

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const license = readFileSync(join(__dirname, 'templates', 'LICENSE.txt')).toString()
const { author } = JSON.parse(readFileSync(join(__dirname, '..', 'package.json')).toString())

const output = license
  .replace('<--YEAR-->', new Date().getFullYear().toString())
  .replace('<--AUTHOR-->', author)

writeFileSync(join(__dirname, '..', 'LICENSE'), output)
