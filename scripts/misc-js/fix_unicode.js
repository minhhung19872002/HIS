const fs = require('fs');
const filePath = 'C:/Source/HIS/backend/src/HIS.Infrastructure/Services/PdfTemplateHelper.cs';
let content = fs.readFileSync(filePath, 'utf-8');

// Remove stray backslashes before non-ASCII (Vietnamese) characters
// Pattern: backslash followed by a Unicode char above 0x7F
let count = 0;
const newContent = content.replace(/\\([\u0080-\uffff])/gu, (match, ch) => {
  count++;
  return ch;
});

fs.writeFileSync(filePath, newContent, 'utf-8');
console.log('Removed ' + count + ' stray backslashes');

// Verify header-ministry line
const idx = newContent.indexOf('header-ministry');
const secondIdx = newContent.indexOf('header-ministry', idx + 1);
if (secondIdx >= 0) {
  const line = newContent.substring(secondIdx, newContent.indexOf('\n', secondIdx));
  console.log('Header line:', line);
}
