// Regression checks for template rendering, draft handling and HTML generation.
// This models form controls; it does not replace a visual browser check.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const source = fs.readFileSync('app.js', 'utf8');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
const decode = text => text.replace(/&(?:amp|lt|gt|quot|#39);/g, entity => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[entity]));
function setup(saved = {}, blocked = false) {
  const elements = new Map();
  const node = key => {
    if (!elements.has(key)) elements.set(key, {textContent:'', style:{}, children:[], events:{}, clicks:0, classList:{toggle(){}}, removeAttribute(){}, closest(){return node('card-' + key)}, addEventListener(type, handler){this.events[type] = handler;}, click(){this.clicks++; return this.events.click?.();}, append(child){this.children.push(child);}, replaceChildren(){this.children = [];}});
    return elements.get(key);
  };
  const form = {
    innerHTML: html.match(/<form[^>]*>([\s\S]*?)<\/form>/)[1],
    addEventListener(){},
    querySelectorAll() { return controls; },
    reportValidity(){return true;},
    reset(){controls.forEach(el => {el.value = el.type === 'checkbox' ? el.value : ''; el.checked = false;});}
  };
  const controls = [];
  const storage = new Map(Object.entries(saved));
  const downloads = new Map();
  const confirmation = {answer:true, calls:0};
  const context = vm.createContext({
    document: {addEventListener(){}, querySelector: selector => selector === '#reportForm' ? form : node(selector), getElementById: node, querySelectorAll: () => [], createElement: () => node(`created-${elements.size}`)},
    Blob, URL:{createObjectURL(blob){const url = `blob:${downloads.size}`; downloads.set(url, blob); return url;}, revokeObjectURL(){}},
    setTimeout(){}, confirm(){confirmation.calls++; return confirmation.answer;},
    localStorage: {getItem: key => {if (blocked) throw Error('blocked'); return storage.get(key) || null;}, setItem: (key, value) => {if (blocked) throw Error('quota'); storage.set(key, value);}},
    FormData: class {constructor(){this.data = controls.filter(el => el.type !== 'checkbox' || el.checked).map(el => [el.name, el.value]);} entries(){return this.data.values();} get(name){return this.data.find(entry => entry[0] === name)?.[1] ?? null;} getAll(name){return this.data.filter(entry => entry[0] === name).map(entry => entry[1]);}},
  });
  // Populate the model from the actual rendered form before draft restoration.
  const cut = source.lastIndexOf('restoreDraft();');
  vm.runInContext(fs.readFileSync('spatial-input.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('deadwood.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('report-export.js', 'utf8'), context);
  vm.runInContext(source.slice(0, cut), context);
  vm.runInContext(fs.readFileSync('protocol-transfer.js', 'utf8'), context);
  for (const match of form.innerHTML.matchAll(/<(input|textarea|select)\b([^>]*)>/g)) {
    const attributes = attrs(match[2]);
    if (attributes.name) {
      const choices = match[1] === 'select' ? form.innerHTML.slice(match.index).split('</select>')[0] : '';
      const options = [...choices.matchAll(/<option([^>]*)>([^<]*)<\/option>/g)].map(option => ({value:decode(attrs(option[1]).value ?? option[2])}));
      controls.push({...attributes, tagName:match[1].toUpperCase(), options, value:decode(attributes.value || ''), type:attributes.type || match[1], checked:false, setCustomValidity(message){this.validationMessage = message;}});
    }
  }
  vm.runInContext('restoreDraft()', context);
  return {context, form, controls, storage, node, downloads, confirmation, run: code => vm.runInContext(code, context), field: name => controls.find(el => el.name === name)};
}
const app = setup();
for (const id of ['saveJson', 'saveWord', 'saveHtml', 'saveCompact']) assert(new RegExp(`<input[^>]*id="${id}"[^>]*checked`).test(html), `${id} is selected by default`);
const compactApp = setup();
compactApp.context.compactSnapshot = {fields:[['namn','Testområde'], ['kommun',null], ['fastighet',[]], ['areal',0], ['datum',''], ['inventerare','Ej angivet'], ['alderDiameter','Ej bedömt'], ['nvt0','0']], images:{}};
const compactHtml = compactApp.run('reportHtml(true, compactSnapshot, true)');
assert(!compactHtml.includes('<b>Kommun / Ort</b>'));
assert(!compactHtml.includes('<b>Fastighetsbeteckning</b>'));
assert(!compactHtml.includes('<b>Inventerare</b>'));
assert(compactHtml.includes('<b>Areal (ha)</b><span>0</span>'));
assert(compactHtml.includes('<span>Ej bedömt</span>'));
assert(!compactHtml.includes('<h2>Bilder</h2>'));
assert(!compactHtml.includes('<h2>Sammanfattning</h2>'));
assert(!compactHtml.includes('<h2>Landskap</h2>'));
assert(compactApp.run('reportHtml(true, compactSnapshot, false)').includes('<b>Kommun / Ort</b><span>Ej angivet</span>'));
assert(!app.form.innerHTML.includes('{{'), 'All template tokens render');
for (const name of ['tackning','begransning','topografi','jordart','markfuktighet','hydrologi','markkemi','metodDetalj','tradslagDetalj','ved_liggande','ved_staende_kommentar']) assert(app.field(name), name);
assert(app.form.innerHTML.includes('class="choice-grid three"'), 'Grid wrappers preserved');
assert(app.form.innerHTML.includes('id="mapImage"'), 'Map upload exists');
app.field('namn').value = '<script>alert("x")</script> & Åäö';
app.field('sammanfattning').value = 'Rad ett\nRad två <b>text</b>';
app.field('nvt0').value = '0';
app.field('ved_liggande').value = app.run("JSON.stringify([{...emptyWoodRow(), tradslag:'Gran', forekomst:'Saknas', karaktar:['Hålig', 'Barkborrepräglad']}])");
app.field('metodDetalj').value = 'Detaljer <test>';
app.field('alderDiameter').value = 'Kommentar om träden';
app.field('terrangKommentar').value = 'Brant i norr\nBlockig mark';
app.field('strukturerDetalj').value = 'Kommentar om vegetationen';
app.field('ved_liggande_kommentar').value = 'Kommentar om veden';
app.field('naturvardsarter').value = 'Artobservation på egen rad';
app.field('polygonGeojson').value = JSON.stringify({type:'Polygon',coordinates:[[[18,59],[19,59],[19,60],[18,59]]]});
app.field('centerCoordinate').value = '18.5, 59.5';
app.field('tackning').checked = true;
const report = app.run('reportHtml(false)');
assert(!report.includes('<script>'));
assert(report.includes('&lt;script&gt;'));
assert(report.includes('Åäö'));
assert(report.includes('Rad ett\nRad två &lt;b&gt;text&lt;/b&gt;'));
assert(report.includes('<span>0</span>'));
assert(report.includes('Trädslag: Gran · Förekomst: Saknas'));
assert(report.includes('Hålig, Barkborrepräglad'));
assert(report.includes('Detaljer &lt;test&gt;'));
assert(report.includes('Kommentar trädskikt'));
assert(report.includes('Kommentar terräng'));
assert(report.includes('Polygon (JSON/GeoJSON)'));
assert(report.includes('18.5, 59.5'));
assert(report.includes('Brant i norr\nBlockig mark'));
assert(report.includes('Kommentar markvegetation'));
assert(report.includes('Kommentar – liggande död ved</b><span>Kommentar om veden'));
assert(report.includes('<h2>Noterade naturvårdsarter</h2><p>Artobservation på egen rad</p>'));
assert(!report.includes('</div>,<div'));
assert(app.run('reportHtml(true)').includes('Inga bilder tillagda.'));
const image = 'data:image/png;base64,aGVsbG8=';
app.run(`images = {image1:${JSON.stringify(image)},mapImage:${JSON.stringify(image)}}`);
assert.equal((app.run('reportHtml(true)').match(/<img /g) || []).length, 2);
assert(!app.run('reportHtml(false)').includes('data:image'));
assert.equal(app.run('Object.keys(images).length'), 2, 'Export without images preserves draft images');
app.run('saveDraft()');
const restored = setup(Object.fromEntries(app.storage));
assert.equal(restored.field('namn').value, app.field('namn').value);
assert.equal(restored.field('nvt0').value, '0');
assert.equal(restored.field('ved_liggande').value, app.field('ved_liggande').value);
assert.equal(restored.field('tackning').checked, true);
assert.equal(restored.run('Object.keys(images).length'), 2);
const legacy = setup({'faltrapport-draft': JSON.stringify([['namn','Äldre utkast']])});
assert.equal(legacy.field('namn').value, 'Äldre utkast');
const legacyOther = setup({'faltrapport-draft': JSON.stringify([['strukturer','Annat'],['strukturerDetalj','Tidigare kommentar']])});
assert.equal(legacyOther.field('strukturerDetalj').value, 'Annat: Tidigare kommentar');
const badDraft = setup({'faltrapport-draft':'invalid'});
assert(badDraft.node('#status').textContent.includes('kunde inte läsas'));
const unavailable = setup({}, true);
unavailable.run('saveDraft()');
assert(unavailable.node('#status').textContent.includes('kunde inte sparas'));
unavailable.run("setStatus('Bild tillagd.')");
assert(unavailable.node('#status').textContent.includes('kunde inte sparas'), 'Storage failure remains visible in the single status line');
assert(unavailable.run('reportHtml(false)').includes('<!doctype html>'));
console.log('PASS: template sections, escaping, zero values, image inclusion/exclusion, draft restoration, legacy draft and storage failures.');

const woodTest = setup();
const woodRows = woodTest.run("JSON.stringify([{...emptyWoodRow(), tradslag:'Tall', forekomst:'Rikligt', grovlek:'Grov >40 cm', nedbrytning:'Mycket starkt nedbruten', karaktar:['Hålig','Keloved/silverved','Annat'], annat:'Spår <test>', klimat:'Solexponerad'}, {...emptyWoodRow(), tradslag:'Gran', karaktar:['Barkborrepräglad']}])");
woodTest.field('ved_liggande').value = woodRows;
woodTest.field('ved_staende').value = woodTest.run("JSON.stringify([{...emptyWoodRow(), tradslag:'Annat', annatTradslag:'Hassel', forekomst:'Saknas'}])");
woodTest.run('applyProtocol(validateProtocol(protocolData()))');
assert.equal(woodTest.field('ved_liggande').value, woodRows);
assert(woodTest.run('reportHtml(false)').includes('Annat: Spår &lt;test&gt;'));
assert(woodTest.run('reportHtml(false)').includes('Trädslag: Hassel · Förekomst: Saknas'));
woodTest.field('ved_liggande').value = woodTest.run("JSON.stringify([{...emptyWoodRow(), annat:'Egen vedkaraktär'}])");
woodTest.run('applyProtocol(validateProtocol(protocolData()))');
assert(woodTest.run('reportHtml(false)').includes('Vedkaraktär: Annat: Egen vedkaraktär'));
assert.equal(woodTest.run("woodCharacterSummary(parseWood(protocolData().fields.find(([name]) => name === 'ved_liggande')[1])[0])"), 'Egen vedkaraktär');
for (const invalid of ["{tradslag:'Gran', karaktar:['Keloved/silverved']}", "{tradslag:'Tall', karaktar:['Barkborrepräglad']}", "{forekomst:'0'}", "{karaktar:['Hålig','Hålig']}", "{nedbrytning:'Okänd'}"]) {
  woodTest.field('ved_liggande').value = woodTest.run(`JSON.stringify([{...emptyWoodRow(), ...${invalid}}])`);
  assert.throws(() => woodTest.run('validateProtocol(protocolData())'), /Ogiltigt/);
}
const woodLegacyFields = [['ved0tradslag','Gran och tall'], ['ved0forekomst','0'], ['ved0detalj','Liggande kommentar'], ['ved1tradslag','Gran'], ['ved2detalj','Högstubbar'], ['ved3detalj','Okänd position'], ['ved4detalj','Mjuk ved']];
const woodLegacy = setup({'faltrapport-draft':JSON.stringify(woodLegacyFields)});
assert(!woodLegacy.field('ved_liggande_kommentar').value.includes('Gran och tall'));
assert(!woodLegacy.field('ved_liggande_kommentar').value.includes('Förekomst: 0'));
assert(woodLegacy.field('ved_liggande_kommentar').value.includes('Liggande kommentar'));
assert(woodLegacy.field('ved_liggande_kommentar').value.includes('Okänd position'));
assert(woodLegacy.field('ved_liggande_kommentar').value.includes('Mjuk ved'));
assert(woodLegacy.field('ved_staende_kommentar').value.includes('Högstubbar'));
woodLegacy.context.legacyWood = {format:'faltrapport',version:1,fields:woodLegacyFields,images:{}};
woodLegacy.run('applyProtocol(validateProtocol(legacyWood))');
const migratedWood = woodLegacy.field('ved_liggande_kommentar').value;
woodLegacy.run('applyProtocol(validateProtocol(protocolData()))');
assert.equal(woodLegacy.field('ved_liggande_kommentar').value, migratedWood);
const generatedWood = setup({'faltrapport-draft':JSON.stringify([
  ['ved_liggande_kommentar', 'Äldre uppgifter – Lågor (liggande död ved): Trädslag: Gran · Förekomst: 0\nMin kommentar\n\nFortsättning'],
  ['ved_staende_kommentar', 'Äldre uppgifter – Högstubbar (brutna stående stammar): Trädslag: Tall · Kommentar: Egen anteckning']
])});
assert.equal(generatedWood.field('ved_liggande_kommentar').value, 'Min kommentar\n\nFortsättning');
assert.equal(generatedWood.field('ved_staende_kommentar').value, 'Egen anteckning');
console.log('PASS: multiple deadwood rows, species-dependent characters, other text, validation, legacy migration and JSON round trip.');

async function verifyTransfer() {
  const projected = setup();
  projected.field('polygonGeojson').value = JSON.stringify([[500000,6500000],[500100,6500000],[500100,6500100],[500000,6500000]]);
  projected.field('centerCoordinate').value = '500050, 6500050';
  projected.run('saveDraft()');
  const projectedCopy = setup();
  projectedCopy.context.projectedData = JSON.parse(projected.run('JSON.stringify(protocolData())'));
  projectedCopy.run('applyProtocol(validateProtocol(projectedData))');
  assert.equal(projectedCopy.run('protocolSignature()'), projected.run('protocolSignature()'));
  assert(!projectedCopy.run('reportHtml(true)').includes('Polygonens koordinatsystem'));
  assert(projectedCopy.run('reportHtml(true)').includes('500050, 6500050'));
  assert.equal(projectedCopy.node('#polygonImportStatus').textContent, 'Polygon importerad');
  projectedCopy.field('polygonGeojson').value = 'Valfri polygontext';
  projectedCopy.field('centerCoordinate').value = 'Nord 6500000, öst 500000 (valfritt system)';
  projectedCopy.run('saveDraft()');
  assert.equal(projectedCopy.node('#polygonImportStatus').textContent, '');
  projectedCopy.run('validateProtocol(protocolData())');
  const older = setup();
  older.context.oldFields = {format:'faltrapport',version:1,images:{},fields:[['polygonGeojson','[[1,2],[3,4]]'],['polygonCrs','EPSG:3006'],['centerCoordinate','500000, 6500000'],['centerCrs','EPSG:3006']]};
  older.run('applyProtocol(validateProtocol(oldFields))');
  assert(older.field('polygonGeojson').value.includes('EPSG:3006'));
  assert(older.field('centerCoordinate').value.includes('EPSG:3006'));
  assert(!older.run('protocolData().fields.some(([name]) => name === "polygonCrs")'));
  const original = app.run('protocolData()');
  const recipient = setup();
  recipient.context.oldProtocol = {format:'faltrapport', version:1, fields:[['strukturer','Annat'],['strukturerDetalj','Tidigare kommentar']], images:{}};
  recipient.run('applyProtocol(validateProtocol(oldProtocol))');
  assert.equal(recipient.field('strukturerDetalj').value, 'Annat: Tidigare kommentar');
  recipient.context.imported = JSON.parse(JSON.stringify(original));
  recipient.run('applyProtocol(validateProtocol(imported))');
  assert.equal(recipient.run('protocolSignature()'), app.run('protocolSignature()'), 'JSON round trip preserves all fields and images');
  assert.equal(recipient.node('#topbarArea').textContent, app.field('namn').value);
  assert.equal(recipient.run('hasUnsavedWork()'), false, 'Unchanged import does not warn');
  recipient.field('naturvardsarter').value = 'Ny observation';
  recipient.confirmation.answer = false;
  recipient.node('#importButton').click();
  assert.equal(recipient.confirmation.calls, 1);
  assert.equal(recipient.node('#importFile').clicks, 0, 'Cancel does not open file picker');
  assert.equal(recipient.field('naturvardsarter').value, 'Ny observation');
  recipient.confirmation.answer = true;
  recipient.node('#importButton').click();
  assert.equal(recipient.node('#importFile').clicks, 1, 'OK opens file picker');
  const beforeInvalidImport = recipient.run('protocolSignature()');
  for (const mutate of [
    value => {value.format = 'unknown';},
    value => {value.version = 99;},
    value => {value.fields.push(['unknown', 'test']);},
    value => {value.fields.push(['namn', 'duplicate']);},
    value => {value.fields.push(['metod', 'invalid']);},
    value => {value.fields.find(entry => entry[0] === 'nvt0')[1] = '9';},
    value => {value.fields.find(entry => entry[0] === 'areal')[1] = '-1';},
    value => {value.fields.find(entry => entry[0] === 'datum')[1] = '2026-02-30';},
    value => {value.images.image1 = 'javascript:alert(1)';},
    value => {value.images.image1 = 'data:image/png;base64,A===';},
    value => {value.images.extra = image;}
  ]) {
    const invalid = JSON.parse(JSON.stringify(original));
    mutate(invalid);
    recipient.context.invalid = invalid;
    assert.throws(() => recipient.run('validateProtocol(invalid)'));
    assert.equal(recipient.run('protocolSignature()'), beforeInvalidImport);
  }
  recipient.context.invalidFile = {size:12, text:async () => 'not JSON'};
  await assert.rejects(recipient.run('readProtocolFile(invalidFile)'), /JSON/);
  recipient.context.largeFile = {size:31 * 1024 * 1024, text:async () => '{}'};
  await assert.rejects(recipient.run('readProtocolFile(largeFile)'), /stor/);
  recipient.context.Image = class {set src(value){} decode(){return Promise.reject(Error('bad image'));}};
  recipient.context.badImageFile = {size:1000, text:async () => JSON.stringify(original)};
  await assert.rejects(recipient.run('readProtocolFile(badImageFile)'), /bild/);
  assert.equal(recipient.run('protocolSignature()'), beforeInvalidImport);

  // Exercise the actual import event, including changes during async reading.
  const incoming = JSON.parse(JSON.stringify(original));
  incoming.images = {};
  recipient.node('#importFile').files = [{size:1000, text:async () => JSON.stringify(incoming)}];
  recipient.field('namn').value = 'Redigerat medan filen valdes';
  recipient.confirmation.answer = false;
  await recipient.node('#importFile').events.change();
  assert.equal(recipient.field('namn').value, 'Redigerat medan filen valdes');
  recipient.confirmation.answer = true;
  recipient.node('#importButton').click();
  await recipient.node('#importFile').events.change();
  assert.equal(recipient.field('namn').value, original.fields.find(([name]) => name === 'namn')[1]);
  assert.equal(recipient.run('Object.keys(images).length'), 0, 'Import replaces old images');

  // Three downloadable files are built from one immutable snapshot.
  const saving = setup();
  saving.field('namn').value = 'Före sparandet';
  saving.field('delomradeId').value = 'A/01';
  let finishWord;
  saving.context.wordReport = () => new Promise(resolve => {finishWord = () => resolve(new Blob(['word fixture']));});
  const save = saving.run('saveAll()');
  saving.field('namn').value = 'Ändring under sparandet';
  finishWord();
  await save;
  const links = saving.node('#savedFileLinks').children;
  assert.deepEqual(links.map(link => link.download), ['faltrapport-A-01.json','faltrapport-A-01.docx','faltrapport-A-01.html']);
  assert(links.every(link => link.clicks === 1));
  const exportedJson = JSON.parse(await saving.downloads.get(links[0].href).text());
  assert.equal(exportedJson.fields.find(([name]) => name === 'namn')[1], 'Före sparandet');
  assert((await saving.downloads.get(links[2].href).text()).includes('Före sparandet'));
  assert.equal(saving.run('hasUnsavedWork()'), true, 'Edits during export still need saving');
  saving.context.wordReport = async () => {throw Error('Word unavailable');};
  await saving.run('saveAll()');
  assert.equal(saving.node('#saveButton').disabled, false);
  assert.equal(saving.field('namn').value, 'Ändring under sparandet');
  assert(saving.node('#status').textContent.includes('Word unavailable'));
  assert.equal(saving.node('#savedFileLinks').children.length, 3, 'Previous fallback links survive a failed export');
  const selections = setup();
  for (const id of ['#saveJson','#saveWord','#saveHtml','#saveCompact']) selections.node(id).checked = true;
  selections.node('#saveDialog').showModal = function(){this.open = true;};
  selections.node('#saveDialog').close = function(){this.open = false;};
  selections.node('#saveButton').click();
  assert.equal(selections.node('#saveDialog').open, true);
  assert.equal(selections.downloads.size, 0, 'Opening the dialog does not export');
  selections.node('#cancelSave').click();
  assert.equal(selections.node('#saveDialog').open, false);
  selections.node('#saveWord').checked = selections.node('#saveHtml').checked = false;
  selections.run('updateSaveOptions()');
  assert.equal(selections.node('#reportContentOptions').disabled, true);
  assert.equal(selections.node('#confirmSave').disabled, false);
  selections.node('#saveJson').checked = false;
  selections.run('updateSaveOptions()');
  assert.equal(selections.node('#confirmSave').disabled, true);
  let wordCalls = 0;
  selections.context.wordReport = async (snapshot, compact) => {wordCalls++; assert.equal(compact, true); return new Blob(['word']);};
  for (let mask = 1; mask < 8; mask++) {
    const options = {json:Boolean(mask & 1), word:Boolean(mask & 2), html:Boolean(mask & 4), compact:true};
    const previousCalls = wordCalls;
    selections.node('#saveJson').checked = options.json;
    selections.node('#saveWord').checked = options.word;
    selections.node('#saveHtml').checked = options.html;
    selections.run('updateSaveOptions()');
    assert.equal(selections.node('#reportContentOptions').disabled, !options.word && !options.html);
    await selections.node('#saveOptionsForm').events.submit({preventDefault(){}});
    assert.equal(wordCalls - previousCalls, options.word ? 1 : 0);
    const files = selections.node('#savedFileLinks').children;
    assert.deepEqual(files.map(file => file.download.split('.').pop()), [options.json && 'json',options.word && 'docx',options.html && 'html'].filter(Boolean));
    if (options.json) {
      const data = JSON.parse(await selections.downloads.get(files[0].href).text());
      assert.deepEqual(data.fields, JSON.parse(selections.run('JSON.stringify(protocolData().fields)')), 'Compact export preserves all JSON fields');
    }
  }
  selections.context.wordReport = async (snapshot, compact) => {assert.equal(compact, false); return new Blob(['full word']);};
  await selections.run('saveAll({json:true, word:true, html:true, compact:false})');
  const fullFiles = selections.node('#savedFileLinks').children;
  assert((await selections.downloads.get(fullFiles[2].href).text()).includes('<span>Ej angivet</span>'));
  assert.deepEqual(JSON.parse(await selections.downloads.get(fullFiles[0].href).text()).fields, JSON.parse(selections.run('JSON.stringify(protocolData().fields)')));
  console.log('PASS: JSON round trip, import OK/cancel, validation, corrupt files/images, import race and three-file save snapshot.');
}

function unzip(buffer) {
  const entries = new Map();
  const end = buffer.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));
  assert(end >= 0, 'Valid ZIP end record');
  const count = buffer.readUInt16LE(end + 10);
  let position = buffer.readUInt32LE(end + 16);
  for (let i = 0; i < count; i++) {
    assert.equal(buffer.readUInt32LE(position), 0x02014b50);
    const method = buffer.readUInt16LE(position + 10);
    const size = buffer.readUInt32LE(position + 20);
    const nameLength = buffer.readUInt16LE(position + 28);
    const extraLength = buffer.readUInt16LE(position + 30);
    const commentLength = buffer.readUInt16LE(position + 32);
    const local = buffer.readUInt32LE(position + 42);
    const name = buffer.subarray(position + 46, position + 46 + nameLength).toString();
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const compressed = buffer.subarray(start, start + size);
    entries.set(name, method === 8 ? require('node:zlib').inflateRawSync(compressed) : compressed);
    position += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function verifyWord() {
  const runtime = vm.createContext({Blob, Buffer, atob, btoa, setTimeout, clearTimeout, setImmediate, clearImmediate, console});
  vm.runInContext(fs.readFileSync('vendor/docx-9.5.1.js', 'utf8'), runtime);
  vm.runInContext(fs.readFileSync('report-export.js', 'utf8'), runtime);
  runtime.report = app.run('reportContent(protocolData())');
  runtime.prepared = [{label:'Kartbild', data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', width:500, height:300}];
  for (const withImages of [false, true]) {
    const blob = await vm.runInContext(`docx.Packer.toBlob(buildWordDocument(report, ${withImages ? 'prepared' : '[]'}))`, runtime);
    assert.equal(blob.type, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const buffer = Buffer.from(await blob.arrayBuffer());
    const parts = unzip(buffer);
    const xml = parts.get('word/document.xml').toString();
    const styles = parts.get('word/styles.xml').toString();
    const rels = parts.get('word/_rels/document.xml.rels').toString();
    assert(xml.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Åäö'));
    assert(xml.includes('Trädslag: Gran · Förekomst: Saknas'));
    assert(xml.includes('Hålig, Barkborrepräglad'));
    assert(xml.includes('<w:br/>'), 'Multiline text preserved');
    assert(xml.includes('w:w="11906"'), 'A4 page width');
    assert(xml.includes('w:w="9638"'), 'Explicit table width');
    assert(styles.includes('255D4B') || xml.includes('255D4B'));
    assert(styles.includes('D9A441'));
    assert.equal(xml.includes('<w:drawing>'), withImages);
    assert.equal([...parts.keys()].filter(name => /^word\/media\/.+\.png$/.test(name)).length, withImages ? 1 : 0);
    assert(!rels.includes('TargetMode="External"'), 'No external image dependencies');
    // Optional QA fixtures, never generated during ordinary regression runs.
    if (process.env.WRITE_DOCX_FIXTURES === '1') {
      fs.mkdirSync('.qa', {recursive:true});
      fs.writeFileSync(`.qa/word-${withImages ? 'with' : 'without'}-images.docx`, buffer);
    }
  }
  console.log('PASS: real DOCX generation, ZIP parts, text, line breaks, A4/table geometry, styles and embedded images.');
  runtime.report = compactApp.run('reportContent(compactSnapshot, true)');
  const compactBlob = await vm.runInContext('docx.Packer.toBlob(buildWordDocument(report, []))', runtime);
  const compactXml = unzip(Buffer.from(await compactBlob.arrayBuffer())).get('word/document.xml').toString();
  assert(compactXml.includes('Ej bedömt'));
  assert(compactXml.includes('>0</w:t>'));
  for (const omitted of ['Kommun / Ort', 'Fastighetsbeteckning', 'Sammanfattning', 'Ej angivet', 'Landskap', 'Inga bilder tillagda.']) assert(!compactXml.includes(omitted), `${omitted} omitted in compact Word`);
  console.log('PASS: save dialog, format combinations, complete JSON, compact/full HTML and compact Word.');
}

(async () => {await verifyTransfer(); await verifyWord();})().catch(error => {console.error(error); process.exitCode = 1;});
