const fs = require('fs');
const css = fs.readFileSync('css/e2b-main.css', 'utf8');
let formatted = css.replace(/\}/g, '}\n').replace(/\{/g, '{\n  ').replace(/;/g, ';\n  ').replace(/\n\s*\n/g, '\n');
fs.writeFileSync('css/e2b-main-formatted.css', formatted);
console.log('Done. Length:', formatted.length);