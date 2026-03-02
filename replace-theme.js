const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const logFile = path.join(__dirname, 'err.log');
fs.writeFileSync(logFile, 'Starting...\n');
function log(msg) {
  fs.appendFileSync(logFile, msg + '\n');
}

try {
  const colorMap = {
    'bg-pastel-bg': 'bg-bg',
    'bg-white dark:bg-stone-800': 'bg-surface',
    'bg-white': 'bg-surface',
    'dark:bg-[#1A1A1A]': 'dark:bg-bg',
    'dark:bg-[#121212]': 'dark:bg-bg',
    'bg-[#F4F4F5]': 'bg-bg',
    'dark:bg-stone-800': 'bg-surface',
    'bg-stone-800/50': 'bg-surface/50',
    'dark:bg-stone-700': 'bg-surface-hover',
    'bg-stone-100': 'bg-bg-hover',

    'border-stone-100 dark:border-stone-700': 'border-border',
    'dark:border-stone-800': 'border-border',
    'border-stone-100': 'border-border',
    'dark:border-stone-700': 'border-border',

    'text-text-main': 'text-text-primary',
    'text-stone-800 dark:text-stone-100': 'text-text-primary',
    'text-stone-700 dark:text-stone-200': 'text-text-primary',
    'text-stone-800 dark:text-white': 'text-text-primary',
    'text-stone-800': 'text-text-primary',
    'dark:text-white': 'text-text-primary',
    'text-white dark:text-stone-200': 'text-text-primary',
    'text-text-muted': 'text-text-secondary',
    'text-stone-500 dark:text-stone-400': 'text-text-secondary',
    'text-stone-600 dark:text-stone-300': 'text-text-secondary',
    'text-stone-500': 'text-text-secondary',
    'text-stone-600': 'text-text-secondary',
    'dark:text-stone-400': 'text-text-secondary',

    'pastel-green': 'income',
    'pastel-pink': 'expense',
    'pastel-blue': 'investment',
    'pastel-peach': 'warning',
    'pastel-purple': 'primary',

    'text-red-500': 'text-expense',
    'text-green-500': 'text-income',
    'text-blue-500': 'text-investment',
    'text-pink-500': 'text-expense',
    'text-purple-500': 'text-primary',
    'text-orange-500': 'text-warning',

    'dark:bg-stone-900/50': 'bg-surface/50',
    'dark:bg-stone-800/50': 'bg-surface/50',
    'bg-stone-50': 'bg-bg-hover',
  };

  const regexReplacements = [
    { p: /bg-pastel-pink/g, r: 'bg-expense' },
    { p: /text-pastel-pink/g, r: 'text-expense' },
    { p: /border-pastel-pink/g, r: 'border-expense' },
    { p: /from-pastel-pink/g, r: 'from-expense' },
    { p: /to-pastel-pink/g, r: 'to-expense' },
    { p: /via-pastel-pink/g, r: 'via-expense' },
    { p: /fill-pink-100/g, r: 'fill-expense\/20' },
    { p: /bg-pastel-green/g, r: 'bg-income' },
    { p: /text-pastel-green/g, r: 'text-income' },
    { p: /border-pastel-green/g, r: 'border-income' },
    { p: /from-pastel-green/g, r: 'from-income' },
    { p: /to-pastel-green/g, r: 'to-income' },
    { p: /bg-pastel-blue/g, r: 'bg-investment' },
    { p: /text-pastel-blue/g, r: 'text-investment' },
    { p: /border-pastel-blue/g, r: 'border-investment' },
    { p: /from-pastel-blue/g, r: 'from-investment' },
    { p: /to-pastel-blue/g, r: 'to-investment' },
    { p: /bg-pastel-peach/g, r: 'bg-warning' },
    { p: /text-pastel-peach/g, r: 'text-warning' },
    { p: /border-pastel-peach/g, r: 'border-warning' },
  ];

  function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    const sortedKeys = Object.keys(colorMap).sort(
      (a, b) => b.length - a.length,
    );
    for (const key of sortedKeys) {
      content = content.replaceAll(key, colorMap[key]);
    }

    for (const { p, r } of regexReplacements) {
      content = content.replace(p, r);
    }

    content = content.replace(/dark:bg-bg/g, '');
    content = content.replace(/dark:bg-surface/g, '');
    content = content.replace(/dark:text-text-primary/g, '');
    content = content.replace(/dark:text-text-secondary/g, '');
    content = content.replace(/dark:border-border/g, '');
    content = content.replace(/ +/g, ' ');
    content = content.replace(/className=' '/g, "className=''");

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      log(`Updated ${filePath}`);
    }
  }

  function traverse(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        traverse(fullPath);
      } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
        processFile(fullPath);
      }
    }
  }

  traverse(srcDir);
  log('Done');
} catch (e) {
  log(e.toString());
}
