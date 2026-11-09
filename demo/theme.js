// Demo helper: load themes/<name>.css from ?theme= (tile by default).
const asked = new URLSearchParams(location.search).get('theme');
// every look in themes/: the catalog's buttons and the card's look: setting use these names
const theme = ['glass', 'game', 'mocha', 'latte', 'dracula', 'nord'].includes(asked) ? asked : 'tile';
document.write(`<link rel="stylesheet" href="../themes/${theme}.css">`);
document.documentElement.dataset.theme = theme;
