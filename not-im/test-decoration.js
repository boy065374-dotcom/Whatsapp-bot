import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const transformText = require('fancy-text-generator');

const samples = [
  'HE King games',
  'Phantom El3rby',
  'Xx_7Kingツ'
];

const styles = [
  'bold',
  'italic',
  'boldItalic',
  'script',
  'fraktur',
  'monospace',
  'underline',
  'strikethrough',
  'superscript',
  'subscript',
  'fancy1',
  'fancy2',
  'fancy3',
  'doubleStruck'
];

for (const input of samples) {
  console.log('\n' + '='.repeat(40));
  console.log('ORIGINAL:', input);
  console.log('='.repeat(40));

  for (const style of styles) {
    try {
      const result = transformText(input, style);
      console.log(`${style}: ${result}`);
    } catch (error) {
      console.log(`${style}: ERROR - ${error.message}`);
    }
  }
}
