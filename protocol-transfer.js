const PROTOCOL_FORMAT = 'faltrapport';
const PROTOCOL_VERSION = 1;
const MAX_IMPORT_BYTES = 30 * 1024 * 1024;
let lastSavedSignature = null;
let exportInProgress = false;
let importInProgress = false;
let importApprovalSignature = null;
let exportUrls = [];

function protocolData() {
  return {
    format:PROTOCOL_FORMAT, version:PROTOCOL_VERSION,
    fields:[...new FormData(form).entries()].filter(([, value]) => typeof value === 'string'),
    images:Object.fromEntries(Object.keys(imageLabels).filter(id => images[id]).map(id => [id, images[id]]))
  };
}
function protocolSignature(snapshot = protocolData()) {
  return JSON.stringify({fields:snapshot.fields, images:snapshot.images});
}
function hasUnsavedWork() {
  const snapshot = protocolData();
  if (pendingImages) return true;
  if (lastSavedSignature !== null) return protocolSignature(snapshot) !== lastSavedSignature;
  return snapshot.fields.some(([, value]) => value.trim()) || Object.keys(snapshot.images).length > 0;
}
function confirmImport() {
  return !hasUnsavedWork() || confirm('Du har börjat redigera protokollet. Spara först om du vill behålla dina ändringar. Importen ersätter alla uppgifter och bilder.\n\nOK = fortsätt importera. Avbryt = gå tillbaka och spara.');
}

function validateProtocol(value) {
  const fail = message => { throw new Error(message); };
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.format !== PROTOCOL_FORMAT) fail('Filen är inte ett Fältprotokoll. Välj JSON-filen som skapades med Spara.');
  if (value.version !== PROTOCOL_VERSION) fail('Protokollets version stöds inte av denna version av formuläret.');
  if (!Array.isArray(value.fields) || value.fields.length > 500) fail('Filen innehåller ogiltiga fält.');
  const controls = [...form.querySelectorAll('[name]')];
  const seen = new Map();
  for (const entry of value.fields) {
    if (!Array.isArray(entry) || entry.length !== 2 || entry.some(item => typeof item !== 'string')) fail('Filen innehåller ogiltiga fältvärden.');
    const [name, text] = entry;
    if (text.length > 100000) fail('Ett textfält är för långt.');
    const matches = controls.filter(control => control.name === name && control.type !== 'file');
    if (!matches.length) fail(`Okänt fält: ${name}. Importen avbröts för att undvika att uppgifter försvinner.`);
    const control = matches[0];
    if (seen.has(name) && (control.type !== 'checkbox' || seen.get(name).has(text))) fail(`Fältet ${name} förekommer flera gånger.`);
    if (!seen.has(name)) seen.set(name, new Set());
    seen.get(name).add(text);
    if (control.type === 'checkbox' && !matches.some(item => item.value === text)) fail(`Ogiltigt kryssval för ${name}.`);
    if (control.tagName === 'SELECT' && ![...control.options].some(option => option.value === text)) fail(`Ogiltigt val för ${name}.`);
    if (control.type === 'number' && text) {
      const number = Number(text);
      const step = Number(control.step || 1);
      if (!/^-?(?:\d+|\d*\.\d+)(?:[eE][+-]?\d+)?$/.test(text) || !Number.isFinite(number) || number < Number(control.min || 0) || (step > 0 && Math.abs(number / step - Math.round(number / step)) > 1e-7)) fail(`Ogiltigt tal för ${name}.`);
    }
    if (control.type === 'date' && text && (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(text)) || new Date(text).toISOString().slice(0, 10) !== text)) fail('Inventeringsdatumet är ogiltigt.');
  }
  if (!value.images || typeof value.images !== 'object' || Array.isArray(value.images)) fail('Filen innehåller ogiltiga bilddata.');
  for (const [id, src] of Object.entries(value.images)) {
    const match = typeof src === 'string' && src.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!Object.hasOwn(imageLabels, id) || !match || match[2].length % 4 !== 0) fail('Filen innehåller en ogiltig bild.');
  }
  return {format:PROTOCOL_FORMAT, version:PROTOCOL_VERSION, fields:value.fields.map(entry => [...entry]), images:{...value.images}};
}

async function readProtocolFile(file) {
  if (file.size > MAX_IMPORT_BYTES) throw new Error('Filen är för stor. Högsta tillåtna storlek är 30 MB.');
  let parsed;
  try { parsed = JSON.parse((await file.text()).replace(/^\uFEFF/, '')); }
  catch { throw new Error('JSON-filen kunde inte läsas. Det befintliga protokollet har inte ändrats.'); }
  const snapshot = validateProtocol(parsed);
  // Decode every image before replacing any of the current work.
  for (const src of Object.values(snapshot.images)) {
    const img = new Image();
    img.src = src;
    try { await img.decode(); }
    catch { throw new Error('En bild i protokollet kunde inte läsas. Importen avbröts.'); }
    if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > 40000000) throw new Error('En bild i protokollet är för stor eller ogiltig.');
  }
  return snapshot;
}

function applyProtocol(snapshot) {
  imageGeneration++; // Ignore image uploads that began before the import.
  form.reset();
  for (const control of form.querySelectorAll('[name]')) {
    const values = snapshot.fields.filter(([name]) => name === control.name).map(([, value]) => value);
    if (control.type === 'checkbox') control.checked = values.includes(control.value);
    else if (control.type !== 'file') control.value = values[0] || '';
  }
  images = {...snapshot.images};
  showImages();
  saveDraft();
  lastSavedSignature = protocolSignature();
  status.textContent = 'Protokollet har importerats. Du kan nu komplettera uppgifter och bilder.';
}

async function saveAll() {
  if (exportInProgress || !form.reportValidity()) return;
  if (pendingImages) { status.textContent = 'Vänta tills bilderna har lästs in och spara sedan igen.'; return; }
  const snapshot = protocolData();
  const signature = protocolSignature(snapshot);
  const base = `faltrapport-${(snapshot.fields.find(([name]) => name === 'delomradeId')?.[1] || 'utkast').trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').slice(0, 80) || 'utkast'}`;
  exportInProgress = true;
  const button = document.querySelector('#saveButton');
  button.disabled = true;
  button.textContent = 'Sparar…';
  status.textContent = 'Skapar JSON, Word och HTML…';
  try {
    validateProtocol(snapshot);
    const json = JSON.stringify({...snapshot, savedAt:new Date().toISOString()}, null, 2);
    if (new Blob([json]).size > MAX_IMPORT_BYTES) throw new Error('Protokollet överstiger 30 MB. Minska antalet eller storleken på bilderna före sparandet.');
    const files = [
      {name:`${base}.json`, label:'JSON – redigerbart protokoll', blob:new Blob([json], {type:'application/json;charset=utf-8'})},
      {name:`${base}.docx`, label:'Word – rapport med bilder', blob:await wordReport(snapshot)},
      {name:`${base}.html`, label:'HTML – rapport med bilder', blob:new Blob([reportHtml(true, snapshot)], {type:'text/html;charset=utf-8'})}
    ];
    // All three files come from the same snapshot, even if typing continues.
    const previousUrls = exportUrls;
    const links = document.querySelector('#savedFileLinks');
    links.replaceChildren();
    exportUrls = [];
    for (const file of files) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(file.blob);
      exportUrls.push(link.href);
      link.download = file.name;
      link.textContent = file.label;
      link.className = 'button button-outline';
      links.append(link);
    }
    document.querySelector('#savedFiles').hidden = false;
    for (const link of links.children) link.click();
    setTimeout(() => previousUrls.forEach(url => URL.revokeObjectURL(url)), 30000);
    lastSavedSignature = signature;
    status.textContent = 'Tre filer har skickats till nedladdningar. Om någon saknas, använd de separata länkarna ovan. JSON-filen används vid import.';
  } catch (error) {
    status.textContent = `Kunde inte skapa alla rapportfiler. ${error.message} Dina uppgifter finns kvar i formuläret.`;
  } finally {
    exportInProgress = false;
    button.disabled = false;
    button.textContent = 'Spara';
  }
}

const importInput = document.querySelector('#importFile');
document.querySelector('#importButton').addEventListener('click', () => {
  if (importInProgress || !confirmImport()) return;
  importApprovalSignature = protocolSignature();
  importInput.value = '';
  importInput.click();
});
importInput.addEventListener('change', async () => {
  const file = importInput.files[0];
  if (!file || importInProgress) return;
  importInProgress = true;
  const button = document.querySelector('#importButton');
  button.disabled = true;
  status.textContent = 'Kontrollerar protokollfilen…';
  try {
    const snapshot = await readProtocolFile(file);
    // Reconfirm if the user edited while file reading/image decoding was pending.
    if (protocolSignature() !== importApprovalSignature && !confirmImport()) {
      status.textContent = 'Importen avbröts. Dina uppgifter finns kvar.';
      return;
    }
    applyProtocol(snapshot);
  } catch (error) {
    status.textContent = `Importen avbröts: ${error.message}`;
  } finally {
    importInProgress = false;
    button.disabled = false;
    importInput.value = '';
    importApprovalSignature = null;
  }
});
