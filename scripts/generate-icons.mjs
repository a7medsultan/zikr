import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'static', 'icons');
mkdirSync(OUT, { recursive: true });

const CRC_TABLE = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();

function crc32(buf) {
	let c = 0xffffffff;
	for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body));
	return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
	const stride = width * 4;
	const raw = Buffer.alloc((stride + 1) * height);
	for (let y = 0; y < height; y++) {
		raw[y * (stride + 1)] = 0;
		Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
			raw,
			y * (stride + 1) + 1
		);
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(raw, { level: 9 })),
		chunk('IEND', Buffer.alloc(0))
	]);
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

const TOP = [16, 78, 58];
const BOTTOM = [4, 22, 17];
const GOLD = [232, 200, 122];
const GOLD_SOFT = [246, 226, 168];

function starPoints(cx, cy, outer, inner, points, rot = 0) {
	const pts = [];
	for (let i = 0; i < points * 2; i++) {
		const a = rot + (i * Math.PI) / points - Math.PI / 2;
		const r = i % 2 === 0 ? outer : inner;
		pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
	}
	return pts;
}

function inPoly(x, y, pts) {
	let inside = false;
	for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
		const [xi, yi] = pts[i];
		const [xj, yj] = pts[j];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

/** Returns coverage 0..1 of gold artwork at a point, in unit space (0..1). */
function goldCoverage(x, y, inset) {
	const cx = 0.5;
	const cy = 0.5;
	const s = 1 - inset * 2;
	const px = (x - 0.5) / s + 0.5;
	const py = (y - 0.5) / s + 0.5;

	let cov = 0;

	// outer ring
	if (inCircle(px, py, cx, cy, 0.455) && !inCircle(px, py, cx, cy, 0.425)) cov = Math.max(cov, 1);

	// eight-point star outline
	const starOut = starPoints(cx, cy, 0.365, 0.185, 8);
	const starIn = starPoints(cx, cy, 0.322, 0.163, 8);
	if (inPoly(px, py, starOut) && !inPoly(px, py, starIn)) cov = Math.max(cov, 1);

	// crescent
	const R = 0.135;
	const cut = 0.112;
	const ox = cx + 0.052;
	const oy = cy - 0.014;
	if (inCircle(px, py, cx, cy, R) && !inCircle(px, py, ox, oy, cut)) cov = Math.max(cov, 1);

	// small sparkles
	const sparks = [
		[cx, cy - 0.31, 0.017],
		[cx + 0.315, cy, 0.014],
		[cx - 0.315, cy, 0.014]
	];
	for (const [sx, sy, sr] of sparks) {
		if (inCircle(px, py, sx, sy, sr)) cov = Math.max(cov, 1);
	}

	return cov;
}

function render(size, { maskable = false } = {}) {
	const SS = 3;
	const inset = maskable ? 0.12 : 0.04;
	const data = new Uint8Array(size * size * 4);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			let hit = 0;
			let gold = null;
			let bx = 0;
			let by = 0;
			for (let sy = 0; sy < SS; sy++) {
				for (let sx = 0; sx < SS; sx++) {
					const u = (x + (sx + 0.5) / SS) / size;
					const v = (y + (sy + 0.5) / SS) / size;
					const c = goldCoverage(u, v, inset);
					if (c > 0) {
						hit++;
						gold = gold ?? mix(GOLD, GOLD_SOFT, c);
					}
					by += v;
					bx += u;
				}
			}
			const total = SS * SS;
			const alpha = hit / total;
			bx /= total;
			by /= total;

			const radial = clamp(1 - Math.hypot(bx - 0.5, by - 0.5) * 0.9, 0, 1);
			const bg = mix(TOP, BOTTOM, clamp(by * 0.85 + (1 - radial) * 0.35, 0, 1));

			const i = (y * size + x) * 4;
			for (let ch = 0; ch < 3; ch++) {
				data[i + ch] = Math.round(alpha > 0 ? bg[ch] + (gold[ch] - bg[ch]) * alpha : bg[ch]);
			}
			data[i + 3] = 255;
		}
	}
	return data;
}

const targets = [
	['icon-192.png', 192, {}],
	['icon-512.png', 512, {}],
	['maskable-512.png', 512, { maskable: true }],
	['apple-touch-icon.png', 180, {}],
	['favicon-64.png', 64, {}]
];

for (const [name, size, opts] of targets) {
	const png = encodePng(size, size, render(size, opts));
	writeFileSync(resolve(OUT, name), png);
	console.log(`wrote ${name} (${size}x${size}, ${png.length} bytes)`);
}