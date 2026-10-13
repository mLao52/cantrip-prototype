/* ---------------------------------------------------------------------
   1. Helpers and constants
   --------------------------------------------------------------------- */

const $  = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const CHARACTER_KEY = 'wf_char';
const NOTES_KEY     = 'wf_notes';

function readStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)); }
  catch (error) { return null; }
}
function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (error) {}
}

function escapeHtml(text) {
  const replacements = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  return String(text).replace(/[&<>"]/g, character => replacements[character]);
}

const signed = number => (number >= 0 ? '+' + number : String(number));

const BOX = 'box';

/* ---------------------------------------------------------------------
   2. App state
   --------------------------------------------------------------------- */

let character = readStorage(CHARACTER_KEY) || {};

let notes = readStorage(NOTES_KEY) || [];

const openNoteIds = new Set();

const saveCharacter = () => writeStorage(CHARACTER_KEY, character);
const saveNotes     = () => writeStorage(NOTES_KEY, notes);


/* ---------------------------------------------------------------------
   3. Navigation
   --------------------------------------------------------------------- */

const PAGES = ['home', 'sheet', 'notes', 'compendium'];

function showPage(pageId) {
  if (!PAGES.includes(pageId)) pageId = 'home';

  $$('.sec').forEach(section => section.classList.toggle('on', section.id === pageId));
  $$('.nav').forEach(button  => button.classList.toggle('on', button.dataset.s === pageId));

  if (pageId === 'home') renderHome();
}

$$('.nav').forEach(button => {
  button.onclick = () => showPage(button.dataset.s);
});


/* ---------------------------------------------------------------------
   4. Home page
   --------------------------------------------------------------------- */
const sfxRoll  = new Audio('assets/roll.mp3');
const sfxNat1  = new Audio('assets/nat1.mp3');
const sfxNat20 = new Audio('assets/nat20.mp3');

sfxRoll.volume  = 0.3;
sfxNat1.volume  = 0.8;
sfxNat20.volume = 0.4;

function playSound(sound) {
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function rollDice() {
  const count = Math.min(100, Math.max(1, parseInt($('#dn').value) || 1));
  const sides = Number($('#dt').value);
  $('#dn').value = count;

  let total, breakdownText;
  let sound = sfxRoll;

  if (sides === 100) {
    const tensRoll = Math.floor(Math.random() * 10) * 10;
    const unitRoll = Math.floor(Math.random() * 10);
    total = (tensRoll === 0 && unitRoll === 0) ? 100 : tensRoll + unitRoll;
    const tensDisplay = tensRoll === 0 ? '00' : tensRoll;
    breakdownText = `<div class="mt-1 break-words">Tens (${tensDisplay}) + Units (${unitRoll}) = ${total}</div>`;
  } else {
    const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
    total = rolls.reduce((sum, value) => sum + value, 0);
    breakdownText = count > 1 ? `<div class="mt-1 break-words">${rolls.join(', ')}</div>` : '';

    if (sides === 20 && count === 1) {
      if (rolls[0] === 1) sound = sfxNat1;
      else if (rolls[0] === 20) sound = sfxNat20;
    }
  }
  playSound(sound);

  const die = $('#die');
  const digits = String(total).length;
  die.textContent = total;
  die.style.fontSize = digits <= 2 ? '4.5rem' : digits === 3 ? '3.5rem' : '2.5rem';

  die.classList.remove('roll');
  void die.offsetWidth;
  die.classList.add('roll');

  const rollLabel = count > 1 && sides !== 100 ? `${count}d${sides}` : 'Roll';
  $('#rollOut').innerHTML =
    `<div class="f text-3xl text-bone">${rollLabel} = ${total}</div>${breakdownText}`;

  console.log(`Rolled ${total}`, sides);
}

$('#rollBtn').onclick = rollDice;
$('#die').onclick = rollDice;
$('#dn').onkeydown = event => { if (event.key === 'Enter') rollDice(); };

function renderHome() {
  $('#hnMsg').textContent = '';

  $('#h-char').textContent = character.name || 'Unnamed character.';
  $('#h-sub').textContent =
    [character.race, character.cls, character.level ? 'level ' + character.level : '']
      .filter(Boolean).join(' ') || 'Fill in your sheet to see it here';

  $('#h-hp').value    = character.hp    ?? '';
  $('#h-hpmax').value = character.hpmax ?? '';

  renderPinnedNotes();
}

function renderPinnedNotes() {
  const pinned = notes.filter(note => note.pinned);

  if (!pinned.length) {
    $('#h-pins').innerHTML =
      '<p class="text-dim sm:col-span-2 lg:col-span-3">Nothing pinned yet. Pin a note from the Notes page and it will show up here.</p>';
    return;
  }

  $('#h-pins').innerHTML = pinned.map(note => `
    <div class="wrap flex flex-col h-72 bg-ink border border-edge rounded p-3 min-h-[9rem]">
      <button data-open="${note.id}" class="wrap f text-xl text-left hover:text-ember shrink-0">${escapeHtml(noteTitle(note))}</button>
      <div tabindex="0" role="region" aria-label="Text of ${escapeHtml(noteTitle(note))}"
           class="wrap scroll flex-1 min-h-0 my-2 text-dim whitespace-pre-wrap">${escapeHtml(note.body) || 'Empty note.'}</div>
      <button data-open="${note.id}" class="self-start text-sm text-verd underline shrink-0">Open in Notes</button>
    </div>`).join('');
}

['hp', 'hpmax'].forEach(key => {
  $('#h-' + key).addEventListener('input', event => {
    character[key] = event.target.value;
    saveCharacter();

    const sheetField = $(`#sheetBody [data-k="${key}"]`);
    if (sheetField) sheetField.value = event.target.value;
  });
});

$('#h-pins').addEventListener('click', event => {
  const button = event.target.closest('[data-open]');
  if (!button) return;

  openNoteIds.add(Number(button.dataset.open));
  renderNotes();
  showPage('notes');
});

$('#hnAdd').onclick = () => {
  const title = $('#hnT').value.trim();
  if (!title) return $('#hnT').focus();

  notes.unshift({ id: Date.now(), title, body: $('#hnB').value, pinned: false });
  saveNotes();

  $('#hnT').value = '';
  $('#hnB').value = '';
  renderNotes();
  $('#hnMsg').textContent = 'Added to Notes. Pin it there to show it here.';
};


/* ---------------------------------------------------------------------
   5. Character sheet
   --------------------------------------------------------------------- */

const ABILITIES = [
  ['str', 'Strength'], ['dex', 'Dexterity'], ['con', 'Constitution'],
  ['int', 'Intelligence'], ['wis', 'Wisdom'], ['cha', 'Charisma'],
];

const SKILLS = [
  ['Acrobatics', 'dex'], ['Animal Handling', 'wis'], ['Arcana', 'int'], ['Athletics', 'str'],
  ['Deception', 'cha'], ['History', 'int'], ['Insight', 'wis'], ['Intimidation', 'cha'],
  ['Investigation', 'int'], ['Medicine', 'wis'], ['Nature', 'int'], ['Perception', 'wis'],
  ['Performance', 'cha'], ['Persuasion', 'cha'], ['Religion', 'int'], ['Sleight of Hand', 'dex'],
  ['Stealth', 'dex'], ['Survival', 'wis'],
];
const PERCEPTION = SKILLS.findIndex(([name]) => name === 'Perception');

const textField = (key, label, type = 'text') =>
  `<label class="block text-sm text-dim">${label}<input data-k="${key}" type="${type}" class="w-full text-bone"></label>`;

const adjustControl = key => `
  <span class="inline-flex gap-1 text-xs">
    <select data-k="md_${key}" class="px-1" aria-label="Adjustment type">
      <option value="add">Add</option>
      <option value="set">Set to</option>
    </select>
    <input data-adj="${key}" type="number" class="w-14 px-1 text-bone" aria-label="Adjustment value">
  </span>`;

const derivedStat = (valueId, label, key, startingText) => `
  <div class="text-sm text-dim">${label}
    <div id="${valueId}" class="f text-2xl text-verd">${startingText}</div>
    <div class="mt-1">${adjustControl(key)}</div>
    <div id="n-${key}" class="text-xs"></div>
  </div>`;

function addValueOf(key) {
  return Number(character['bn_' + key]) || 0;
}

function setValueOf(key) {
  const raw = character['ov_' + key];
  return raw === '' || raw == null || isNaN(Number(raw)) ? null : Number(raw);
}

function modeOf(key) {
  return character['md_' + key] || (setValueOf(key) !== null ? 'set' : 'add');
}

function applyAdjustment(key, calculated) {
  if (modeOf(key) === 'set') return setValueOf(key) ?? calculated;
  return calculated + addValueOf(key);
}

function unusedValueNote(key) {
  if (modeOf(key) === 'set') {
    return addValueOf(key) ? `Add ${signed(addValueOf(key))} kept, not applied` : '';
  }
  return setValueOf(key) !== null ? `Set to ${setValueOf(key)} kept, not applied` : '';
}

function syncAdjustBox(key) {
  const box = $(`#sheetBody [data-adj="${key}"]`);
  if (box) box.value = character[(modeOf(key) === 'set' ? 'ov_' : 'bn_') + key] ?? '';
}

function buildSheet() {
  $('#sheetBody').innerHTML = `
  <div class="${BOX} grid grid-cols-2 md:grid-cols-4 gap-3">
    ${textField('name', 'Character name')}${textField('cls', 'Class')}
    ${textField('race', 'Race')}${textField('level', 'Level', 'number')}
    ${textField('bg', 'Background')}${textField('align', 'Alignment')}
    ${textField('xp', 'Experience points')}${textField('player', 'Player')}
  </div>

  <div class="grid lg:grid-cols-3 gap-5">

    <!-- column 1: abilities and saving throws -->
    <div class="space-y-5">
      <div class="${BOX}"><h3 class="f text-xl mb-3">Abilities</h3>
        <p class="text-xs text-dim mb-3">Add raises a value. Set to replaces it. Both numbers are kept when you switch between them.</p>
        <div class="grid grid-cols-2 gap-3">${ABILITIES.map(([key, name]) => `
          <div class="border border-edge rounded p-2 text-center">
            <div class="text-sm text-dim">${name}</div>
            <input data-k="${key}" type="number" min="1" max="30" placeholder="10" class="w-16 text-center text-xl" aria-label="${name} base score">
            <div class="f text-2xl text-verd" id="m-${key}">+0</div>
            <div class="text-xs text-dim" id="f-${key}">Score 10</div>
            <div class="mt-2 flex justify-center">${adjustControl(key)}</div>
            <div id="n-${key}" class="text-xs text-dim mt-1"></div>
          </div>`).join('')}
        </div>
      </div>

      <div class="${BOX}"><h3 class="f text-xl mb-3">Saving throws</h3>
        ${ABILITIES.map(([key, name]) => `
        <div class="flex items-center gap-2 py-0.5">
          <label class="flex items-center gap-2 flex-1 min-w-0">
            <input type="checkbox" data-k="sp_${key}">
            <span id="s-${key}" class="f w-9 text-verd">+0</span>
            <span class="min-w-0">${name}<span id="n-sv_${key}" class="block text-xs text-dim"></span></span>
          </label>
          ${adjustControl('sv_' + key)}
        </div>`).join('')}
      </div>
    </div>

    <!-- column 2: skills -->
    <div class="${BOX}"><h3 class="f text-xl mb-3">Skills</h3>
      ${SKILLS.map(([name, ability], index) => `
      <div class="flex items-center gap-2 py-0.5">
        <label class="flex items-center gap-2 flex-1 min-w-0">
          <input type="checkbox" data-k="kp_${index}">
          <span id="k-${index}" class="f w-9 text-verd">+0</span>
          <span class="min-w-0">${name} <span class="text-dim text-sm">(${ability})</span><span id="n-sk_${index}" class="block text-xs text-dim"></span></span>
        </label>
        ${adjustControl('sk_' + index)}
      </div>`).join('')}
    </div>

    <!-- column 3: combat numbers, hit points, attacks -->
    <div class="space-y-5">
      <div class="${BOX} grid grid-cols-2 gap-3">
        ${textField('ac', 'Armor class', 'number')}${textField('speed', 'Speed (ft)', 'number')}
        ${derivedStat('init', 'Initiative', 'init', '+0')}
        ${derivedStat('pb', 'Proficiency', 'pb', '+2')}
        <div class="col-span-2">${derivedStat('pp', 'Passive perception', 'pp', '10')}</div>
      </div>
      <div class="${BOX} grid grid-cols-2 gap-3"><h3 class="f text-xl col-span-2">Hit points</h3>
        ${textField('hp', 'Current', 'number')}${textField('hpmax', 'Maximum', 'number')}
        ${textField('hd', 'Hit dice')}${textField('temp', 'Temporary', 'number')}
      </div>
      <div class="${BOX}"><label class="text-sm text-dim">Attacks and spells<textarea data-k="atk" rows="4" class="w-full text-bone"></textarea></label></div>
    </div>
  </div>

  <div class="grid md:grid-cols-2 gap-5">
    <div class="${BOX}"><label class="text-sm text-dim">Features and traits<textarea data-k="feat" rows="6" class="w-full text-bone"></textarea></label></div>
    <div class="${BOX}"><label class="text-sm text-dim">Equipment<textarea data-k="gear" rows="6" class="w-full text-bone"></textarea></label></div>
  </div>`;

  $$('#sheetBody [data-k]').forEach(field => {
    const key = field.dataset.k;
    if (field.type === 'checkbox')          field.checked = !!character[key];
    else if (field.tagName === 'SELECT')    field.value = modeOf(key.slice('md_'.length));
    else                                    field.value = character[key] ?? '';
  });
  $$('#sheetBody [data-adj]').forEach(box => syncAdjustBox(box.dataset.adj));

  recalculateSheet();
}

function recalculateSheet() {
  const level = Math.min(20, Math.max(1, Number(character.level) || 1));
  const levelBonus = 2 + Math.floor((level - 1) / 4);
  const proficiency = applyAdjustment('pb', levelBonus);

  const scoreOf    = ability => applyAdjustment(ability, Number(character[ability]) || 10);
  const modifierOf = ability => Math.floor((scoreOf(ability) - 10) / 2);
  const skillBonusOf = index => applyAdjustment(
    'sk_' + index,
    modifierOf(SKILLS[index][1]) + (character['kp_' + index] ? proficiency : 0)
  );

  $('#pb').textContent   = signed(proficiency);
  $('#init').textContent = signed(applyAdjustment('init', modifierOf('dex')));
  $('#pp').textContent   = applyAdjustment('pp', 10 + skillBonusOf(PERCEPTION));

  ABILITIES.forEach(([key]) => {
    $('#m-' + key).textContent = signed(modifierOf(key));
    $('#f-' + key).textContent = 'Score ' + scoreOf(key);
    $('#s-' + key).textContent = signed(applyAdjustment(
      'sv_' + key,
      modifierOf(key) + (character['sp_' + key] ? proficiency : 0)
    ));
  });
  SKILLS.forEach((skill, index) => {
    $('#k-' + index).textContent = signed(skillBonusOf(index));
  });

  const levelNote = (modeOf('pb') === 'set' && setValueOf('pb') !== null)
    ? `Level ${level} would give +${levelBonus}`
    : `Level ${level} gives +${levelBonus}`;
  const noteKeys = [
    ...ABILITIES.map(([key]) => key),
    ...ABILITIES.map(([key]) => 'sv_' + key),
    ...SKILLS.map((skill, index) => 'sk_' + index),
    'init', 'pb', 'pp',
  ];
  noteKeys.forEach(key => {
    $('#n-' + key).textContent = [key === 'pb' ? levelNote : '', unusedValueNote(key)]
      .filter(Boolean).join('. ');
  });
}

$('#sheetBody').addEventListener('input', event => {
  const target = event.target;

  if (target.dataset.adj) {
    const key = target.dataset.adj;
    character[(modeOf(key) === 'set' ? 'ov_' : 'bn_') + key] = target.value;
  } else {
    const key = target.dataset.k;
    if (!key) return;
    character[key] = target.type === 'checkbox' ? target.checked : target.value;
    if (key.startsWith('md_')) syncAdjustBox(key.slice('md_'.length));
  }

  saveCharacter();
  recalculateSheet();
});


/* ---------------------------------------------------------------------
   6. Notes page
   --------------------------------------------------------------------- */

const noteTitle = note => note.title || 'Untitled';

const pinButton = (note, extraClasses) => `
  <button data-act="p" data-id="${note.id}" aria-pressed="${!!note.pinned}"
    class="${extraClasses} rounded border px-2 py-0.5 text-sm ${note.pinned ? 'border-ember text-ember' : 'border-edge text-dim hover:border-verd'}">${note.pinned ? 'Pinned' : 'Pin'}</button>`;

function renderNotes() {
  const grid = $('#grid');

  if (!notes.length) {
    grid.innerHTML = '<p class="text-dim md:col-span-2">No cards yet. Give your first one a title above.</p>';
    return;
  }

  grid.innerHTML = notes.map(note => openNoteIds.has(note.id) ? `
    <div class="box ${note.pinned ? 'border-ember' : 'border-verd'} md:col-span-2 space-y-3">
      <button data-act="t" data-id="${note.id}" class="wrap f text-xl w-full text-left" aria-expanded="true">${escapeHtml(noteTitle(note))} <span class="text-dim text-base">(close)</span></button>
      <input data-f="title" data-id="${note.id}" class="w-full" value="${escapeHtml(note.title)}" aria-label="Title">
      <textarea data-f="body" data-id="${note.id}" rows="9" class="w-full" placeholder="Write here...">${escapeHtml(note.body)}</textarea>
      <div class="flex items-center justify-between">
        <button data-act="d" data-id="${note.id}" class="text-ember text-sm underline">Delete card</button>
        ${pinButton(note, '')}
      </div>
    </div>` : `
    <div class="box relative ${note.pinned ? 'border-ember' : 'border-edge hover:border-verd'}">
      <button data-act="t" data-id="${note.id}" aria-expanded="false" class="block w-full text-left pr-16">
        <div class="wrap f text-xl">${escapeHtml(noteTitle(note))}</div>
        <div class="wrap text-dim mt-1 line-clamp-2">${escapeHtml(note.body) || 'Empty. Tap to start writing.'}</div>
      </button>
      ${pinButton(note, 'absolute top-3 right-3')}
    </div>`).join('');
}

function addNote() {
  const title = $('#nt').value.trim();
  if (!title) return $('#nt').focus();

  const note = { id: Date.now(), title, body: '', pinned: false };
  notes.unshift(note);
  openNoteIds.add(note.id);
  saveNotes();

  $('#nt').value = '';
  renderNotes();

  const textarea = $(`textarea[data-id="${note.id}"]`);
  if (textarea) textarea.focus();
}

$('#addNote').onclick = addNote;
$('#nt').onkeydown = event => { if (event.key === 'Enter') addNote(); };

$('#grid').addEventListener('click', event => {
  const button = event.target.closest('[data-act]');
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.act;

  if (action === 't') {
    if (openNoteIds.has(id)) openNoteIds.delete(id); else openNoteIds.add(id);
  } else if (action === 'p') {
    const note = notes.find(item => item.id === id);
    if (note) { note.pinned = !note.pinned; saveNotes(); }
  } else if (action === 'd' && confirm('Delete this card?')) {
    notes = notes.filter(item => item.id !== id);
    saveNotes();
  }
  renderNotes();
});

$('#grid').addEventListener('input', event => {
  const field = event.target.dataset.f;
  if (!field) return;

  const note = notes.find(item => item.id === Number(event.target.dataset.id));
  if (note) { note[field] = event.target.value; saveNotes(); }
});


/* ---------------------------------------------------------------------
   7. Compendium
   --------------------------------------------------------------------- */

const API_ROOT = 'https://www.dnd5eapi.co';
const API_VERSION_PATH = '/api/2014/';
const CATEGORIES = [
  'spells', 'equipment', 'magic-items', 'classes',
  'conditions', 'features', 'skills', 'weapon-properties',
];

const categoryCache = {};

$('#cat').innerHTML = CATEGORIES
  .map(category => `<option value="${category}">${category.replace('-', ' ')}</option>`).join('');

async function fetchApi(path) {
  const response = await fetch(API_ROOT + path);
  if (!response.ok) throw new Error('API error ' + response.status);
  return response.json();
}

async function renderResults() {
  const category = $('#cat').value;
  const search = $('#q').value.trim().toLowerCase();
  const results = $('#res');

  try {
    if (!categoryCache[category]) {
      results.textContent = 'Loading...';
      categoryCache[category] = (await fetchApi(API_VERSION_PATH + category)).results;
    }

    const matches = categoryCache[category].filter(entry => entry.name.toLowerCase().includes(search));
    results.innerHTML = matches.length
      ? matches.map(entry => `<button data-u="${entry.url}" class="block w-full text-left px-3 py-1.5 rounded hover:bg-edge">${escapeHtml(entry.name)}</button>`).join('')
      : '<p class="p-3 text-dim">Nothing matches that name. Try a shorter search or another category.</p>';
  } catch (error) {
    results.innerHTML = '<p class="p-3 text-ember">Could not reach dnd5eapi.co. Check your connection and try again.</p>';
  }
}

const HIDDEN_API_FIELDS = ['index', 'url', 'updated_at'];

function renderApiValue(value, depth = 0) {
  if (value == null) return '';
  if (typeof value !== 'object') return escapeHtml(value);

  if (Array.isArray(value)) {
    if (value.every(item => typeof item !== 'object')) {
      return value.map(item => `<p class="mb-1">${escapeHtml(item)}</p>`).join('');
    }
    return value.map(item =>
      item && item.name && item.desc
        ? `<div class="mb-2"><b class="text-bone">${escapeHtml(item.name)}.</b> ${renderApiValue(item.desc, depth + 1)}</div>`
        : `<div class="mb-1">${renderApiValue(item, depth + 1)}</div>`
    ).join('');
  }

  const isReference = value.name && value.url && Object.keys(value).length <= 3;
  if (isReference) return escapeHtml(value.name);

  return Object.entries(value)
    .filter(([key]) => !HIDDEN_API_FIELDS.includes(key) && !(depth === 0 && key === 'name'))
    .map(([key, inner]) => {
      const html = renderApiValue(inner, depth + 1);
      return html
        ? `<div class="mb-1"><span class="text-verd capitalize">${key.replace(/_/g, ' ')}:</span> ${html}</div>`
        : '';
    }).join('');
}

$('#res').addEventListener('click', async event => {
  const button = event.target.closest('[data-u]');
  if (!button) return;

  const detail = $('#det');
  detail.textContent = 'Loading...';
  try {
    const entry = await fetchApi(button.dataset.u);
    detail.innerHTML = `<h3 class="f text-3xl text-bone mb-3">${escapeHtml(entry.name || '')}</h3>${renderApiValue(entry)}`;
    detail.scrollTop = 0;
  } catch (error) {
    detail.innerHTML = '<p class="text-ember">Could not load that entry. Try again.</p>';
  }
});

$('#cat').onchange = renderResults;
$('#q').oninput = renderResults;


/* ---------------------------------------------------------------------
   8. Footer
   --------------------------------------------------------------------- */

$('#wipe').onclick = () => {
  if (!confirm('Erase your character sheet and all notes? This cannot be undone.')) return;

  try {
    localStorage.removeItem(CHARACTER_KEY);
    localStorage.removeItem(NOTES_KEY);
  } catch (error) {}

  character = {};
  notes = [];
  openNoteIds.clear();
  buildSheet();
  renderNotes();
  showPage('home');
};

/* ---------------------------------------------------------------------
   9. Startup
   --------------------------------------------------------------------- */

buildSheet();
renderNotes();
renderResults();
showPage(location.hash.slice(1));
