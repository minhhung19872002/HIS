const fs = require('fs');
const pdfParse = require('pdf-parse');

const file = process.argv[2] || 'C:/Users/ADMIN/Documents/HIS/NangCap8.pdf';
const buf = fs.readFileSync(file);
pdfParse(buf).then(data => {
  console.log('Pages:', data.numpages);
  console.log('---TEXT---');
  console.log(data.text);
}).catch(e => console.error('Error:', e.message));
