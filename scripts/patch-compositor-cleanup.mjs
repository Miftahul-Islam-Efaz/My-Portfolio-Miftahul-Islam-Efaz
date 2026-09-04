// Scratch, idempotent. Removes the dead .comp-credit selector left behind
// after the credit row was deleted.
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'src/styles/compositor.css';
const raw = readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
const fix = (s) => (crlf ? s.replace(/\n/g, '\r\n') : s);

const oldStr = fix(
  [
    '   AFTER THE STRIP',
    '   Both of these arrive as the scaffolding leaves - they are what the',
    '   cleared space is for.',
    '   ================================================================== */',
    '',
    '.comp-close,',
    '.comp-credit {',
    '\t/* 62ch, the measure the notes advertise. It applies to READING text,',
    '\t   which is these two lines - not to a 118px display statement. */',
  ].join('\n'),
);

const newStr = fix(
  [
    '   AFTER THE STRIP',
    '   The close line arrives as the scaffolding leaves - it is what the',
    '   cleared space is for.',
    '   ================================================================== */',
    '',
    '.comp-close {',
    '\t/* 62ch, the measure the notes advertise. It applies to READING text,',
    '\t   which this line is - not to a 92px display statement. */',
  ].join('\n'),
);

if (raw.includes(newStr)) {
  console.log('SKIP  dead .comp-credit selector');
} else if (!raw.includes(oldStr)) {
  console.log('MISS  dead .comp-credit selector');
  process.exitCode = 1;
} else {
  writeFileSync(file, raw.replace(oldStr, newStr));
  console.log('OK    dead .comp-credit selector');
}
