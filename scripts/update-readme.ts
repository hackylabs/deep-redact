#!/usr/bin/env ts-node

import {readFileSync, writeFileSync} from "fs";
import {join} from "path";
import {mainOptions} from "./mainOptions";
import {blacklistKeyConfig} from "./blacklistKeyConfig";
import {benchmarks} from "./benchTable";

const readme = readFileSync(join(__dirname, 'templates', 'README.txt')).toString();

const output = readme
  .replace('<--MAIN_OPTIONS-->', mainOptions)
  .replace('<--BLACKLIST_KEY_CONFIG-->', blacklistKeyConfig)
  .replace('<--BENCH-->', benchmarks);

writeFileSync(join(__dirname, '..', 'README.md'), output);