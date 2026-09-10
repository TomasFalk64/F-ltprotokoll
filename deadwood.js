const woodGroups = [['liggande', 'Liggande död ved'], ['staende', 'Stående död ved']];
const woodSpecies = ['Gran', 'Tall', 'Björk', 'Asp', 'Sälg', 'Rönn', 'Ek', 'Al', 'Bok', 'Ask', 'Alm', 'Lind', 'Lönn', 'Annat'];
const woodOptions = {
  forekomst: ['Saknas', 'Enstaka', 'Sparsamt', 'Måttligt', 'Rikligt'],
  grovlek: ['Klen <20 cm', 'Medel 20–40 cm', 'Grov >40 cm', 'Blandade dimensioner'],
  nedbrytning: ['Nyligen död', 'Svagt nedbruten', 'Måttligt nedbruten', 'Starkt nedbruten', 'Mycket starkt nedbruten'],
  klimat: ['Solexponerad', 'Beskuggad']
};
const woodLabels = {forekomst: 'Förekomst', grovlek: 'Grovlek', nedbrytning: 'Nedbrytning', karaktar: 'Vedkaraktär', klimat: 'Mikroklimat'};
function woodCharacters(species) {
  return ['Hålig', 'Brandpräglad', ...(species === 'Tall' ? ['Keloved/silverved', 'Kådindränkt', 'Törskatepräglad'] : species === 'Gran' ? ['Barkborrepräglad'] : [])];
}
function parseWood(text) {
  const rows = JSON.parse(text || '[]');
  const keys = ['tradslag', 'annatTradslag', 'forekomst', 'grovlek', 'nedbrytning', 'karaktar', 'annat', 'klimat'];
  if (!Array.isArray(rows) || rows.length > 100) throw new Error('Ogiltiga uppgifter om död ved.');
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).some(key => !keys.includes(key)) ||
        keys.some(key => key === 'karaktar' ? !Array.isArray(row[key]) : typeof row[key] !== 'string') ||
        !['', ...woodSpecies].includes(row.tradslag) ||
        Object.entries(woodOptions).some(([key, values]) => !['', ...values].includes(row[key])) ||
        row.karaktar.some(value => !['Annat', ...woodCharacters(row.tradslag)].includes(value)) || new Set(row.karaktar).size !== row.karaktar.length ||
        (row.tradslag !== 'Annat' && row.annatTradslag)) {
      throw new Error('Ogiltigt val för död ved.');
    }
  }
  return rows.map(row => ({...row, karaktar:row.karaktar.filter(value => value !== 'Annat'), annat:row.annat || (row.karaktar.includes('Annat') ? 'Annat' : '')}));
}
function emptyWoodRow() {
  return {tradslag:'', annatTradslag:'', forekomst:'', grovlek:'', nedbrytning:'', karaktar:[], annat:'', klimat:''};
}
function woodSelect(key, values, value, placeholder = '–') {
  return `<select data-wood-field="${key}"><option value="">${placeholder}</option>${values.map(item => `<option${item === value ? ' selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select>`;
}
function woodCharacterSummary(row) {
  return [...row.karaktar, row.annat.trim()].filter(Boolean).join(', ') || '–';
}
function woodRowHtml(row, index) {
  return `<div class="wood-row" data-wood-row="${index}"><div class="wood-species"><label>Trädslag${woodSelect('tradslag', woodSpecies, row.tradslag, 'Välj trädslag…')}</label><label${row.tradslag === 'Annat' ? '' : ' hidden'}>Ange trädslag<input data-wood-field="annatTradslag" value="${escapeHtml(row.annatTradslag)}"></label></div><div class="wood-columns">${Object.entries(woodLabels).map(([key, label]) => key === 'karaktar' ? `<div class="wood-character"><span class="wood-label">${label}</span><details><summary>${escapeHtml(woodCharacterSummary(row))}</summary><div class="wood-character-options">${woodCharacters(row.tradslag).map(item => `<label class="choice"><input type="checkbox" data-wood-field="karaktar" value="${escapeHtml(item)}"${row.karaktar.includes(item) ? ' checked' : ''}><span>${escapeHtml(item)}</span></label>`).join('')}<label>Annan vedkaraktär<input data-wood-field="annat" value="${escapeHtml(row.annat)}"></label></div></details></div>` : `<label>${label}${woodSelect(key, woodOptions[key], row[key])}</label>`).join('')}<button class="wood-remove" type="button" data-wood-remove aria-label="Ta bort trädslagsrad ${index + 1}" title="Ta bort trädslag">×</button></div></div>`;
}
function woodGroupHtml(id, title) {
  return `<fieldset class="dead-entry" data-wood-group="${id}"><legend>${title}</legend><input type="hidden" name="ved_${id}" value=""><div class="wood-rows">${woodRowHtml(emptyWoodRow(), 0)}</div><button type="button" class="button button-outline wood-add" data-wood-add>Lägg till trädslag</button><label>Kommentar – ${title.toLowerCase()}<textarea name="ved_${id}_kommentar" rows="3" placeholder="Beskriv med egna ord"></textarea></label></fieldset>`;
}
function restoreWood() {
  document.querySelectorAll('[data-wood-group]').forEach(group => {
    const rows = parseWood(group.querySelector('input[type="hidden"]').value);
    group.querySelector('.wood-rows').innerHTML = (rows.length ? rows : [emptyWoodRow()]).map(woodRowHtml).join('');
  });
}
function setupWood() {
  document.addEventListener('click', event => {
    document.querySelectorAll('.wood-character details[open]').forEach(details => {
      if (!details.contains(event.target)) details.open = false;
    });
  });
  document.querySelectorAll('[data-wood-group]').forEach(group => {
    const container = group.querySelector('.wood-rows');
    const sync = () => {
      const rows = [...container.querySelectorAll('[data-wood-row]')].map(element => {
        const row = emptyWoodRow();
        element.querySelectorAll('[data-wood-field]').forEach(input => {
          if (input.type === 'checkbox') { if (input.checked) row.karaktar.push(input.value); }
          else row[input.dataset.woodField] = input.value;
        });
        return row;
      });
      group.querySelector('input[type="hidden"]').value = rows.some(row => Object.values(row).some(value => value.length)) ? JSON.stringify(rows) : '';
    };
    group.addEventListener('input', event => {
      if (event.target.dataset.woodField === 'annat') {
        const element = event.target.closest('[data-wood-row]');
        const checked = [...element.querySelectorAll('[data-wood-field="karaktar"]')].filter(input => input.checked).map(input => input.value);
        element.querySelector('summary').textContent = woodCharacterSummary({karaktar:checked, annat:event.target.value});
      }
      sync();
    });
    group.addEventListener('change', event => {
      const element = event.target.closest('[data-wood-row]');
      if (!element) return;
      if (event.target.dataset.woodField === 'tradslag') {
        const allowed = woodCharacters(event.target.value);
        element.querySelectorAll('[data-wood-field="karaktar"]').forEach(input => { if (!allowed.includes(input.value)) input.checked = false; });
        if (event.target.value !== 'Annat') element.querySelector('[data-wood-field="annatTradslag"]').value = '';
        sync();
        const row = parseWood(group.querySelector('input[type="hidden"]').value)[Number(element.dataset.woodRow)] || emptyWoodRow();
        element.outerHTML = woodRowHtml(row, Number(element.dataset.woodRow));
        container.querySelector(`[data-wood-row="${element.dataset.woodRow}"] select`).focus();
      } else if (event.target.dataset.woodField === 'karaktar') {
        const checked = [...element.querySelectorAll('[data-wood-field="karaktar"]')].filter(input => input.checked).map(input => input.value);
        element.querySelector('summary').textContent = woodCharacterSummary({karaktar:checked, annat:element.querySelector('[data-wood-field="annat"]').value});
      }
      sync();
    });
    group.addEventListener('click', event => {
      if (event.target.closest('[data-wood-add]')) {
        if (container.children.length >= 100) return;
        container.insertAdjacentHTML('beforeend', woodRowHtml(emptyWoodRow(), container.children.length));
        container.lastElementChild.querySelector('select').focus();
      } else if (event.target.closest('[data-wood-remove]')) {
        event.target.closest('[data-wood-row]').remove();
        [...container.children].forEach((row, index) => { row.dataset.woodRow = index; });
        group.querySelector('[data-wood-add]').focus();
      } else return;
      sync();
      saveDraft();
    });
  });
}
function woodReportFields(fields, compact = false) {
  const value = name => fields.find(([key]) => key === name)?.[1] || '';
  return woodGroups.flatMap(([id, title]) => {
    const rows = parseWood(value(`ved_${id}`)).filter(row => Object.values(row).some(value => value.length));
    return [...(rows.length ? rows.map(row => [title, [!compact || isReportValueFilled(row.tradslag) ? `Trädslag: ${row.tradslag === 'Annat' ? row.annatTradslag || 'Annat' : row.tradslag || 'Ej angivet'}` : '', ...Object.entries(woodLabels).map(([key, label]) => {
      const text = key === 'karaktar' ? [...row.karaktar, (compact ? isReportValueFilled(row.annat) : row.annat) && `Annat: ${row.annat}`].filter(Boolean).join(', ') : row[key];
      return compact && !isReportValueFilled(text) ? '' : `${label}: ${text || 'Ej bedömt'}`;
    })].filter(Boolean).join(' · ')]) : [[title, 'Ej angivet']]), [`Kommentar – ${title.toLowerCase()}`, value(`ved_${id}_kommentar`) || 'Ej angivet']];
  });
}
function migrateWood(fields) {
  const legacyLabels = ['Lågor (liggande död ved)', 'Torrakor (stående helt döda träd)', 'Högstubbar (brutna stående stammar)', 'Nyligen bildad död ved', 'Starkt nedbrutna lågor (mjuk ved)'];
  // Remove summaries generated by the previous migration, retaining written comments.
  for (const entry of fields) {
    if (!['ved_liggande_kommentar', 'ved_staende_kommentar'].includes(entry[0])) continue;
    entry[1] = entry[1].split('\n').map(line => {
      const title = legacyLabels.find(label => line.startsWith(`Äldre uppgifter – ${label}: `));
      if (!title) return line;
      const content = line.slice(`Äldre uppgifter – ${title}: `.length);
      if (content.startsWith('Kommentar: ')) return content.slice('Kommentar: '.length);
      const marker = ' · Kommentar: ';
      const index = content.indexOf(marker);
      return index < 0 ? null : content.slice(index + marker.length);
    }).filter(line => line !== null).join('\n');
  }
  legacyLabels.forEach((title, index) => {
    const entries = fields.filter(([name, value]) => name === `ved${index}detalj` && value);
    if (!entries.length) return;
    const name = `ved_${index === 1 || index === 2 ? 'staende' : 'liggande'}_kommentar`;
    const text = entries.map(([, value]) => value).join('\n');
    const comment = fields.find(([key]) => key === name);
    if (comment) comment[1] = [comment[1], text].filter(Boolean).join('\n');
    else fields.push([name, text]);
  });
  return fields.filter(([name]) => !/^ved[0-4](tradslag|forekomst|grovlek|klimat|detalj)$/.test(name));
}
