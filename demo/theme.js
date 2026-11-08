// Demo helper: load themes/<name>.css from ?theme= (tile by default).
const asked = new URLSearchParams(location.search).get('theme');
const theme = ['glass', 'game'].includes(asked) ? asked : 'tile';
document.write(`<link rel="stylesheet" href="../themes/${theme}.css">`);
document.documentElement.dataset.theme = theme;
