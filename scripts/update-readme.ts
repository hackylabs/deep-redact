#!/usr/bin/env ts-node

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { mainOptions } from './mainOptions'
import { blacklistKeyConfig } from './blacklistKeyConfig'
import { stringTestConfig } from './stringTestConfig'
import { benchmarks } from './benchTable'
import { updateBenchChart } from './benchChart'

updateBenchChart()
const readme = readFileSync(join(__dirname, 'templates', 'README.txt')).toString()

const output = readme
  .replace('<--MAIN_OPTIONS-->', mainOptions)
  .replace('<--BLACKLIST_KEY_CONFIG-->', blacklistKeyConfig)
  .replace('<--STRING_TEST_CONFIG-->', stringTestConfig)
  .replace('<--BENCH-->', benchmarks)

writeFileSync(join(__dirname, '..', 'README.md'), output)
