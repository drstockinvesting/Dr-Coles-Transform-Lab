import { init as initTranslation } from './modules/translation.js';
import { init as initReflection } from './modules/reflection.js';
import { init as initRotation } from './modules/rotation.js';
import { init as initDilation } from './modules/dilation.js';

// Tab switching
document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', function() {
  document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
  this.classList.add('active');
  document.querySelector(`.panel[data-panel="${this.dataset.tab}"]`).classList.add('active');
}));

// Collapsible info boxes
// Set max-height on itext elements so CSS transition works
function initInfoBox(panel) {
  const box = panel.querySelector('.info-box');
  if (!box) return;
  const itext = box.querySelector('.itext');
  if (!itext) return;

  // Measure natural height and lock it so transition has a target
  itext.style.maxHeight = itext.scrollHeight + 'px';

  // Click anywhere on the box to toggle
  box.addEventListener('click', () => {
    box.classList.toggle('collapsed');
    if (!box.classList.contains('collapsed')) {
      itext.style.maxHeight = itext.scrollHeight + 'px';
    }
  });
}

// Collapse/expand based on level: levels 1 & 2 expanded, 3+ collapsed
function setInfoBoxForLevel(panel, level) {
  const box = panel.querySelector('.info-box');
  if (!box) return;
  const itext = box.querySelector('.itext');
  if (itext) itext.style.maxHeight = itext.scrollHeight + 'px';
  if (level <= 2) {
    box.classList.remove('collapsed');
  } else {
    box.classList.add('collapsed');
  }
}

document.querySelectorAll('.panel').forEach(panel => {
  initInfoBox(panel);
  // Listen for level button clicks within this panel
  panel.querySelectorAll('.lbtn').forEach(btn => {
    btn.addEventListener('click', function() {
      setInfoBoxForLevel(panel, +this.dataset.level);
    });
  });
});

// Initialize all transformation modules
initTranslation();
initReflection();
initRotation();
initDilation();
