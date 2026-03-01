import * as fs from 'fs';
import * as path from 'path';

interface ExportMap {
  [key: string]: {
    import: string;
    require: string;
    types: string;
  };
}

function generateExportPath(filePath: string): string {
  // Remove src/ and .ts extension, handle index files specially
  const normalizedPath = filePath
    .replace(/^src\//, '');

  if (normalizedPath.endsWith('/index')) {
    return normalizedPath.replace(/\/index$/, '');
  }
  return normalizedPath;
}

function generateExports(dir: string = 'src'): ExportMap {
  const exports: ExportMap = {};

  function processDirectory(currentDir: string) {
    const files = fs.readdirSync(currentDir);

    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        processDirectory(fullPath);
      } else if (file.endsWith('.ts') && !file.endsWith('.d.ts') && !file.endsWith('.test.ts')) {
        const exportPath = generateExportPath(fullPath);
        const distPath = exportPath.replace(/\.ts$/, '');
        const entry = {
          import: `./dist/${distPath}.mjs`,
          require: `./dist/${distPath}.js`,
          types: `./dist/types/${distPath}.d.ts`,
        };

        if (exportPath === 'index.ts') {
          exports['.'] = entry;
        }
        exports[`./${exportPath}`] = entry;
      }
    }
  }

  processDirectory(dir);
  return exports;
}

function updatePackageJson() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Generate new exports
  const newExports = generateExports();

  // Update package.json
  packageJson.exports = newExports;

  // Write back to package.json with proper formatting
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n'
  );
}

updatePackageJson();
