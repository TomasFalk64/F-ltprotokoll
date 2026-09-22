const writingHints = {
  metodDetalj: 'Ange om annan metod använts',
  begransningDetalj: 'Väder, sikt, tidsbrist eller delar som inte kunnat undersökas',
  kommun: 'Kommun eller närmaste ort',
  fastighet: 'Fastighetsnamn och nummer',
  inventerare: 'Namn på inventerare',
  tradslagDetalj: 'Ange andra förekommande trädslag',
  alderDiameter: 'Åldersvariation, dimensioner, luckor och föryngring',
  naturvardestradKommentar: 'trädslag, dimension, särdrag, läge',
  terrangKommentar: 'variation inom området, fuktstråk, särskilda delmiljöer',
  markskiktArter: 'Exempelvis husmossa, väggmossa, vitmossor eller renlavar',
  markskiktStruktur: 'Sammanhängande mattor, blottad mark, fuktighet och växtsubstrat',
  faltskiktStruktur: 'Variation i höjd och täthet, blomning, betesspår och luckor',
  buskskiktStruktur: 'Täthet, höjdvariation, föryngring och skyddande buskage',
  markanvandning: 'Exempelvis skogsbruk, bete eller friluftsliv; omfattning och läge',
  kollektnoteringarDna: 'Kollekt-ID, artfynd, substrat, plats samt provtagning och DNA-status',
  landskapKommentar: 'samband med omgivningen, barriärer, övergångar'
};

const collapsibleParts = [];
const navigationEntries = [];

function statusPresentation(message, warning = '') {
  if (warning) return {state:'error', text:`🔴 ${warning}`};
  if (/kunde inte|Kunde inte|Importen avbröts:/.test(message)) return {state:'error', text:`🔴 ${message}`};
  if (/^Sparar/.test(message)) return {state:'busy', text:'🟡 Sparar…'};
  if (/^Läser in/.test(message)) return {state:'busy', text:'🟡 Läser in bild…'};
  if (/^Skapar/.test(message)) return {state:'busy', text:'🟡 Skapar filer…'};
  if (/^Kontrollerar/.test(message)) return {state:'busy', text:'🟡 Kontrollerar import…'};
  if (/^Vänta|^Importen avbröts\./.test(message)) return {state:'notice', text:`🟡 ${message}`};
  if (/^Utkast sparas/.test(message)) return {state:'ready', text:'⚪ Redo · sparas lokalt när du fyller i'};
  if (/skickats till nedladdningar/.test(message)) return {state:'saved', text:'🟢 Filer skapade · länkar finns nedanför'};
  return {state:'saved', text:'🟢 Sparat lokalt'};
}

function filledSummary(controls, imageCount = 0) {
  const fields = new Set();
  let records = 0;
  for (const control of controls) {
    if (!control.name || control.type === 'file') continue;
    if (['ved_liggande', 'ved_staende'].includes(control.name)) {
      try {
        records += parseWood(control.value).filter(row => Object.values(row).some(value => value.length)).length;
      } catch {
        // Draft restoration reports invalid data; the summary must remain usable.
        if (control.value.trim()) fields.add(control.name);
      }
    } else if (control.type === 'checkbox' || control.type === 'radio' ? control.checked : control.value.trim() !== '') {
      fields.add(control.name);
    }
  }
  return [
    records ? `${records} ${records === 1 ? 'registrering' : 'registreringar'}` : '',
    fields.size ? `${fields.size} ${fields.size === 1 ? 'ifyllt fält' : 'ifyllda fält'}` : '',
    imageCount ? `${imageCount} ${imageCount === 1 ? 'bild' : 'bilder'}` : ''
  ].filter(Boolean).join(' · ') || 'Inget ifyllt';
}

function updateSectionSummaries() {
  for (const {container, summary} of collapsibleParts) {
    const imageCount = [...container.querySelectorAll('.image-input')].filter(input => images[input.dataset.target]).length;
    summary.textContent = ` · ${filledSummary(container.querySelectorAll('[name]'), imageCount)}`;
  }
  for (const {container, check, link, label} of navigationEntries) {
    const imageCount = [...container.querySelectorAll('.image-input')].filter(input => images[input.dataset.target]).length;
    const filled = filledSummary(container.querySelectorAll('[name]'), imageCount) !== 'Inget ifyllt';
    check.hidden = !filled;
    link.setAttribute('aria-label', `${label}${filled ? ' – innehåller uppgifter' : ' – inget ifyllt'}`);
  }
}

function setupTopbar() {
  const navigation = document.querySelector('#sectionNavigation');
  const labels = {
    '01':'Överblick', '02':'Grunduppgifter', '03':'Träd', '04':'Markvegetation',
    '05':'Naturvärdesträd', '06':'Terräng', '07':'Död ved',
    '08':'Påverkan', '09':'Arter', '10':'Landskap', '11':'Dokumentation'
  };
  document.querySelectorAll('#reportForm > .panel').forEach(container => {
    const number = container.querySelector('.section-number')?.textContent.trim();
    const label = `${number} ${labels[number]}`;
    container.id = `section-${number}`;
    const link = document.createElement('a');
    link.href = `#${container.id}`;
    const caption = document.createElement('span');
    caption.textContent = label;
    const check = document.createElement('span');
    check.className = 'navigation-check';
    check.textContent = '✓';
    check.hidden = true;
    check.setAttribute('aria-hidden', 'true');
    link.append(caption, check);
    link.addEventListener('click', event => {
      event.preventDefault();
      document.querySelector('#navigationMenu').open = false;
      const heading = container.querySelector('.section-heading .collapse-toggle');
      if (heading.getAttribute('aria-expanded') === 'false') heading.click();
      heading.focus({preventScroll:true});
      container.scrollIntoView({block:'start'});
    });
    navigation.append(link);
    navigationEntries.push({container, link, check, label});
  });
  const menus = [...document.querySelectorAll('.top-menu')];
  menus.forEach(menu => {
    menu.querySelector('summary').addEventListener('click', () => {
      menus.forEach(other => { if (other !== menu) other.open = false; });
    });
    menu.querySelectorAll('.top-dropdown button').forEach(button => button.addEventListener('click', () => {
      menu.open = false;
    }));
  });
  document.addEventListener('click', event => {
    menus.forEach(menu => { if (!menu.contains(event.target)) menu.open = false; });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    menus.forEach(menu => {
      if (!menu.open) return;
      menu.open = false;
      menu.querySelector('summary').focus();
      event.preventDefault();
    });
  });
}

function setupFormUI() {
  document.querySelectorAll('#reportForm input[name], #reportForm textarea[name]').forEach(control => {
    if (writingHints[control.name]) control.placeholder = writingHints[control.name];
  });
  document.querySelectorAll('#reportForm .panel, #reportForm .subsection, #reportForm .dead-entry, #reportForm .compact-fields:has(> h3)').forEach((container, index) => {
    const header = container.querySelector(':scope > .section-heading, :scope > .info-heading, :scope > h3, :scope > legend');
    if (!header) return;
    const heading = header.matches('h3, legend') ? header : header.querySelector('h2, h3');
    if (!heading) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'collapse-toggle';
    button.setAttribute('aria-expanded', 'true');
    const chevron = document.createElement('span');
    chevron.className = 'collapse-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    const title = document.createElement('span');
    title.textContent = heading.textContent;
    const summary = document.createElement('span');
    summary.className = 'collapse-summary';
    button.append(chevron, title, summary);
    heading.replaceChildren(button);
    const content = document.createElement('div');
    content.className = 'collapse-content';
    content.id = `section-content-${index}`;
    button.setAttribute('aria-controls', content.id);
    for (const child of [...container.childNodes]) {
      if (child !== header) content.append(child);
    }
    container.append(content);
    button.addEventListener('click', () => {
      const collapsed = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!collapsed));
      content.hidden = collapsed;
      container.classList.toggle('is-collapsed', collapsed);
    });
    // Reveal a collapsed field if native form validation needs to focus it.
    content.addEventListener('invalid', () => {
      content.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      container.classList.remove('is-collapsed');
    }, true);
    collapsibleParts.push({container, summary});
  });
}
