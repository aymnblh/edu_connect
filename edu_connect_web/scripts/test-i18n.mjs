import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.resolve(__dirname, '../src/lib/locales');
const localeFiles = fs
  .readdirSync(localesDir)
  .filter((name) => name.endsWith('.ts') && name !== 'types.ts')
  .sort();

assert.ok(localeFiles.length > 0, 'Expected at least one locale dictionary file.');

const seenKeys = new Map();
const requiredLocales = ['fr', 'ar', 'en'];

for (const fileName of localeFiles) {
  const fullPath = path.join(localesDir, fileName);
  const source = fs.readFileSync(fullPath, 'utf8');
  const sf = ts.createSourceFile(fullPath, source, ts.ScriptTarget.Latest, true);

  let foundObject = false;
  sf.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const decl of node.declarationList.declarations) {
      if (!decl.initializer || !ts.isObjectLiteralExpression(decl.initializer)) continue;
      foundObject = true;

      for (const prop of decl.initializer.properties) {
        assert.ok(ts.isPropertyAssignment(prop), `Unexpected entry in ${fileName}`);
        const key = ts.isStringLiteral(prop.name) ? prop.name.text : prop.name.getText(sf);

        assert.ok(
          !seenKeys.has(key),
          `Duplicate translation key "${key}" found in ${fileName} and ${seenKeys.get(key)}`
        );
        seenKeys.set(key, fileName);

        assert.ok(
          ts.isObjectLiteralExpression(prop.initializer),
          `Translation entry "${key}" in ${fileName} must be an object`
        );

        const langs = new Set();
        for (const langProp of prop.initializer.properties) {
          assert.ok(ts.isPropertyAssignment(langProp), `Invalid locale prop for "${key}" in ${fileName}`);
          const lang = ts.isIdentifier(langProp.name)
            ? langProp.name.text
            : ts.isStringLiteral(langProp.name)
              ? langProp.name.text
              : langProp.name.getText(sf);
          langs.add(lang);
        }

        for (const req of requiredLocales) {
          assert.ok(langs.has(req), `Missing "${req}" translation for key "${key}" in ${fileName}`);
        }
      }
    }
  });

  assert.ok(foundObject, `No translation map object found in ${fileName}`);
}

console.log(`i18n check passed: ${seenKeys.size} unique keys across ${localeFiles.length} locale files (fr/ar/en).`);
