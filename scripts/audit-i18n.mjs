import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { CATALOGS, findMissing } from '../src/lib/i18n/index.js';

console.log('--- missing keys per locale ---');
for (const code of Object.keys(CATALOGS)) {
	const missing = findMissing(code);
	console.log(`${code}: ${missing.length ? missing.join(', ') : 'complete'}`);
}

/** Rough scan for user-visible English left in the component layer. */
const LABELLED =
	/aria-label="([^"{]+)"|title="([^"{]+)"|placeholder="([^"{]+)"|>\s*([A-Z][A-Za-z][^<{]*?)\s*</g;

const IGNORED = new Set(['en', 'ar', '∞', 'OK']);

console.log('\n--- hard-coded strings in components ---');
let found = 0;
const TARGETS = ['src/lib/components', 'src/lib/state', 'src/lib/utils', 'src/routes'];
for (const target of TARGETS) {
	for (const file of walk(target)) {
		if (file.includes('i18n')) continue;
		const text = readFileSync(file, 'utf8');
		for (const match of text.matchAll(LABELLED)) {
			const value = (match[1] ?? match[2] ?? match[3] ?? match[4] ?? '').trim();
			if (!value || value.length < 2) continue;
			if (IGNORED.has(value)) continue;
			if (/^[{]/.test(value)) continue;
			if (!/^[A-Za-z]/.test(value)) continue;
			if (['div', 'span', 'button', 'input', 'svg', 'path', 'section', 'p'].includes(value)) continue;
			found++;
			console.log(`  ${file}: ${JSON.stringify(value)}`);
		}
	}
}
console.log(found === 0 ? '  none' : `  ${found} to review`);

function walk(dir, out = []) {
	if (!statSync(dir, { throwIfNoEntry: false })) return out;
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) walk(p, out);
		else if (extname(p) === '.svelte') out.push(p);
	}
	return out;
}