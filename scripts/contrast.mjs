// Sjekker WCAG-kontrast for fargetokenene. Kjør: node scripts/contrast.mjs
const hex = (h) => h.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255);
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = (h) => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const pairs = process.argv.slice(2).length ? [process.argv.slice(2)] : [
  ['#0B2530', '#F7F4EF'], ['#0B2530', '#EEF4F6'], ['#3E5761', '#F7F4EF'], ['#3E5761', '#EEF4F6'], ['#3E5761', '#FFFFFF'],
  ['#FFFFFF', '#C43D21'], ['#C43D21', '#F7F4EF'], ['#B53A20', '#F7F4EF'], ['#D9482B', '#F7F4EF'], ['#D9482B', '#0B2530'],
  ['#1B8A9C', '#F7F4EF'], ['#13707F', '#F7F4EF'], ['#13707F', '#EEF4F6'], ['#F7F4EF', '#14485A'], ['#F7F4EF', '#0B2530'],
  ['#7FC8A9', '#0B2530'], ['#E9A92B', '#0B2530'], ['#B9CDD3', '#0B2530'], ['#B9CDD3', '#14485A'], ['#F28A6F', '#0B2530'], ['#0B2530','#E9A92B'], ['#0B2530','#7FC8A9'],['#0B2530','#D9482B'],
];
for (const [fg, bg] of pairs) console.log(`${fg} på ${bg}: ${ratio(fg, bg).toFixed(2)}`);
