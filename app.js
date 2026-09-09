const form = document.querySelector('#reportForm');
const status = document.querySelector('#status');
const fieldNames = ['metod','tackning','begransning','skogstyp','tradslag','sarskildSkog','aldersstruktur','skiktning','bestandsstruktur','topografi','jordart','markfuktighet','hydrologi','markkemi','vegetation','strukturer','processer','paaverkan','anslutande','landskap','grans'];
const options = {
  metod:['Översiktlig områdesbeskrivning','Naturvärdesinventering (NVI), ange nivå/detaljeringsgrad','Riktad artinventering','Annan'], tackning:['Hela området genomgånget','Större delen genomgången','Delar/stickprov'], begransning:['Inga betydande','Snötäckt mark','Tät vegetation/dålig sikt','Svårframkomlig terräng','Tidsbegränsning'], skogstyp:['Grandominerad','Talldominerad','Barrblandskog','Blandskog barr/löv','Lövdominerad'], tradslag:['Gran','Tall','Björk','Asp','Sälg','Rönn','Ek'], sarskildSkog:['Hällmarkstallskog','Sumpskog','Tallmosse','Bäckdrag','Ädellöv'], aldersstruktur:['Likåldrig','Viss åldersspridning','Olikåldrig / flera trädgenerationer'], skiktning:['Enskiktad','Tvåskiktad','Flerskiktad'], bestandsstruktur:['Slutet','Luckor/öppningar','Riklig underväxt'], topografi:['Plant','Sluttande','Kuperat','Branter/Lodytor','Blockmark'], jordart:['Morän','Sand/Grus','Torv/Organisk','Lera','Berg i dagen'], markfuktighet:['Torr','Frisk','Fuktig','Blöt'], hydrologi:['Källpåverkat/Översilning','Bäck/Dike','Småvatten','Sumpskogsstråk'], markkemi:['Kalkpåverkad / Rikt markvatten','Surt / Näringsfattigt'], vegetation:['Risdominerad (blåbär, lingon, ljung)','Mossdominerad (husmossa, väggmossa)','Ört-/Gräsrik (högörter, lågörter)','Ormbunksrik','Fuktvegetation (vitmossor, starr, fräken)','Kalkindikatorer'], strukturer:['Lodytor / bergväggar','Block / beskuggade block','Hällmarker','Källmiljö / översilning','Bäck / fuktstråk','Sumpskog','Övergång skog–myr/våtmark','Solexponerad ved / gamla träd','Annat'], processer:['Lång trädkontinuitet','Kontinuerlig tillförsel av död ved','Naturlig självgallring / Luckdynamik','Rotvältor / Vindfällen','Brandspår (kolade stubbar/träd)','Naturlig översvämning / vattenståndsvariation'], paaverkan:['Gamla stubbar','Färska stubbar','Gallrat / Röjt','Stickvägar / Körskador i mark','Dikning (aktiva / igensatta dikesdrag)','Plantering / Markberett','Vägar / kraftledningsgata / annan exploatering'], anslutande:['Gränsar till skyddad natur (NR/VSO/Nyckelbiotop)','Äldre skog gränsar till området'], landskap:['Ingår i ett större sammanhängande värdeområde','Ekologisk korridor / Bäckdrag'], grans:['Ekologisk gräns','Administrativ gräns (fastighetsgräns/hyggeskant)']
};
const nvt = ['Gamla barrträd (plattkronor/grov bark etc.)','Särskilt värdefulla lövträd (asp, sälg, rönn, ek)','Grova träd (>50 cm dbh)','Hålträd/stamhåligheter','Skadade träd/brandljud/blottad ved','Träd med riklig lav-/mossvegetation','Kjolgranar/senvuxna undertryckta träd'];
const deadwood = ['Lågor (liggande död ved)','Torrakor (stående helt döda träd)','Högstubbar (brutna stående stammar)','Nyligen bildad död ved','Starkt nedbrutna lågor (mjuk ved)'];
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const scale = ['0 – saknas', '1 – enstaka', '2 – sparsamt', '3 – måttligt', '4 – rikligt'];
const details = {metod:'Nivå/detaljeringsgrad, inriktning eller annan metod', begransning:'Beskriv begränsningar och delar som inte inventerats', tradslag:'Övriga trädslag', strukturer:'Andra strukturer och småmiljöer'};
function choices(name, values) {
  return values.map(value => `<label class="choice"><input type="checkbox" name="${name}" value="${escapeHtml(value)}"><span>${escapeHtml(value)}</span></label>`).join('') + (details[name] ? `<label class="choice-detail">${details[name]}<input name="${name}Detalj"></label>` : '');
}
function select(name, label) {
  return `<select id="${name}" name="${name}" aria-label="${escapeHtml(label)}"><option value="">Ej bedömt</option>${scale.map((text, n) => `<option value="${n}">${text}</option>`).join('')}</select>`;
}
const markGroups = [['Topografi','topografi'],['Jordart','jordart'],['Markfuktighet','markfuktighet'],['Hydrologi','hydrologi'],['Markkemi','markkemi']];
const tokens = Object.fromEntries(fieldNames.map(name => [name.toUpperCase(), choices(name, options[name])]));
tokens.BEGRANSNINGAR = tokens.BEGRANSNING;
tokens.NVT = nvt.map((item, i) => `<div class="score-row"><label for="nvt${i}">${escapeHtml(item)}</label>${select(`nvt${i}`, item)}</div>`).join('');
tokens.MARKBLOCK = markGroups.map(([title, name]) => `<div class="subsection"><h3>${title}</h3><div class="choice-grid four">${choices(name, options[name])}</div></div>`).join('');
tokens.DODVED = deadwood.map((item, i) => `<fieldset class="dead-entry"><legend>${item}</legend><div class="field-grid two"><label>Trädslag<input name="ved${i}tradslag" placeholder="Ex. gran, tall; specificera skillnader nedan"></label><label>Förekomst${select(`ved${i}forekomst`, `${item}: förekomst`)}</label><label>Grovlek<select name="ved${i}grovlek"><option value="">Ej bedömt</option><option>Klen (&lt;20 cm)</option><option>Medelgrov (20–40 cm)</option><option>Grov (&gt;40 cm)</option><option>Flera grovlekar (ange nedan)</option></select></label><label>Mikroklimat<select name="ved${i}klimat"><option value="">Ej bedömt</option><option>Solexponerad</option><option>Beskuggad / fuktig</option><option>Både solexponerad och beskuggad / fuktig</option></select></label><label class="choice-detail">Detaljer per trädslag / kommentar<textarea name="ved${i}detalj" rows="2" placeholder="Ex. gran: 3, grov, beskuggad; tall: 1, klen, solexponerad"></textarea></label></div></fieldset>`).join('');
form.innerHTML = form.innerHTML.replace(/\{\{([A-Z]+)\}\}/g, (_, token) => {
  if (!(token in tokens)) throw new Error(`Okänd mallmarkör: ${token}`);
  return tokens[token];
});

const imageLabels = {mapImage:'Kartbild', image1:'Översiktsbild av beståndet', image2:'Särskilt naturvärdeselement', image3:'Extra dokumentation'};
let images = {};
let pendingImages = 0;
let imageGeneration = 0;
const imageVersions = {};
const storageStatus = document.querySelector('#storageStatus');
function updateProgress() {
  const areaName = new FormData(form).get('namn')?.trim() || '';
  const areaLabel = document.querySelector('#topbarArea');
  areaLabel.textContent = areaName;
  areaLabel.title = areaName;
  const groups = new Map();
  for (const el of form.querySelectorAll('input[name], textarea[name], select[name]')) {
    const filled = el.type === 'checkbox' ? el.checked : Boolean(el.value.trim());
    groups.set(el.name, groups.get(el.name) || filled);
  }
  const percent = Math.round([...groups.values()].filter(Boolean).length / groups.size * 100);
  document.querySelector('#completionValue').textContent = `${percent}%`;
  document.querySelector('#progressBar').style.width = `${percent}%`;
}
function saveDraft() {
  updateProgress();
  try {
    localStorage.setItem('faltrapport-draft', JSON.stringify([...new FormData(form).entries()].filter(([, value]) => typeof value === 'string')));
    localStorage.setItem('faltrapport-images', JSON.stringify(images));
    storageStatus.textContent = 'Utkast sparat i denna webbläsare, inklusive tillagda bilder.';
  } catch {
    storageStatus.textContent = 'Utkastet kunde inte sparas fullständigt lokalt. Spara rapporten som fil innan du lämnar sidan.';
  }
}
function showImages() {
  for (const id of Object.keys(imageLabels)) {
    const img = document.getElementById(id);
    if (images[id]) img.src = images[id]; else img.removeAttribute('src');
    img.closest('.upload-card').classList.toggle('has-image', Boolean(images[id]));
    document.querySelector(`[data-remove="${id}"]`).disabled = !images[id];
  }
}
function restoreDraft() {
  try {
    const entries = JSON.parse(localStorage.getItem('faltrapport-draft') || '[]');
    if (!Array.isArray(entries) || !entries.every(entry => Array.isArray(entry) && entry.length === 2 && entry.every(value => typeof value === 'string'))) throw new Error('Ogiltigt utkast');
    for (const el of form.querySelectorAll('[name]')) {
      const values = entries.filter(([name]) => name === el.name).map(([, value]) => value);
      if (el.type === 'checkbox') el.checked = values.includes(el.value);
      else if (el.type !== 'file') el.value = values[0] || '';
    }
    const savedImages = JSON.parse(localStorage.getItem('faltrapport-images') || '{}');
    for (const id of Object.keys(imageLabels)) {
      if (typeof savedImages?.[id] === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(savedImages[id])) images[id] = savedImages[id];
    }
    storageStatus.textContent = entries.length || Object.keys(images).length ? 'Sparat utkast återställt.' : 'Utkast sparas i denna webbläsare. Spara en rapportfil för en egen kopia.';
  } catch {
    storageStatus.textContent = 'Det lokala utkastet kunde inte läsas. Spara en rapportfil för att behålla nya uppgifter.';
  }
  showImages();
  updateProgress();
}
function download(includeImages) {
  if (!form.reportValidity()) return;
  if (includeImages && pendingImages) { status.textContent = 'Vänta tills bilderna har lästs in och spara sedan igen.'; return; }
  const blob = new Blob([reportHtml(includeImages)], {type:'text/html;charset=utf-8'});
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const id = form.elements.delomradeId.value.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').slice(0, 80) || 'utkast';
  link.href = url;
  link.download = `faltrapport-${id}${includeImages ? '-med-bilder' : '-utan-bilder'}.html`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  status.textContent = 'Rapportfilen har skickats till webbläsarens nedladdningar.';
}
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('input', saveDraft);
form.addEventListener('change', saveDraft);
document.querySelector('#exportWithImages').addEventListener('click', () => download(true));
document.querySelector('#exportWithoutImages').addEventListener('click', () => download(false));
document.querySelector('#saveButton').addEventListener('click', () => saveAll());
document.querySelector('#clearButton').addEventListener('click', () => {
  if (!confirm('Rensa alla uppgifter och bilder i utkastet? Nedladdade rapportfiler påverkas inte.')) return;
  imageGeneration++;
  form.reset();
  images = {};
  lastSavedSignature = null;
  showImages();
  saveDraft();
  status.textContent = 'Formuläret är rensat.';
});
document.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => {
  imageVersions[button.dataset.remove] = (imageVersions[button.dataset.remove] || 0) + 1;
  delete images[button.dataset.remove];
  document.querySelector(`[data-target="${button.dataset.remove}"]`).value = '';
  showImages();
  saveDraft();
}));
document.querySelectorAll('.image-input').forEach(input => input.addEventListener('change', async () => {
  const file = input.files[0];
  if (!file) return;
  const generation = imageGeneration;
  const version = imageVersions[input.dataset.target] || 0;
  pendingImages++;
  input.disabled = true;
  status.textContent = 'Läser in bild…';
  let url;
  try {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Välj en bild i JPEG-, PNG- eller WebP-format.');
    url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    const factor = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * factor));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * factor));
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (generation !== imageGeneration || version !== (imageVersions[input.dataset.target] || 0)) return;
    images[input.dataset.target] = canvas.toDataURL('image/jpeg', 0.85);
    showImages();
    saveDraft();
    status.textContent = 'Bild tillagd i rapporten.';
  } catch (error) {
    if (generation === imageGeneration) status.textContent = `Bilden kunde inte läsas. ${error.message}`;
  } finally {
    if (url) URL.revokeObjectURL(url);
    pendingImages--;
    input.disabled = false;
    input.value = '';
  }
}));
restoreDraft();
