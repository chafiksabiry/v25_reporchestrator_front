import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'src');

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(tsx|jsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

let fixed = 0;
for (const file of walk(srcDir)) {
  let content = fs.readFileSync(file, 'utf8');
  if (/import\s+React\b/.test(content)) continue;
  if (!/<[A-Za-z/]/.test(content)) continue;

  const namedImport = content.match(/^import\s+(\{[^}]+\})\s+from\s+['"]react['"]/m);
  if (namedImport) {
    content = content.replace(
      namedImport[0],
      `import React, ${namedImport[1]} from 'react'`
    );
  } else {
    content = `import React from 'react';\n${content}`;
  }

  fs.writeFileSync(file, content);
  fixed++;
  console.log(path.relative(srcDir, file));
}
console.log(`\nFixed ${fixed} files`);
