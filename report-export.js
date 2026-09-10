// Shared report content keeps HTML and Word exports in sync.
function isReportValueFilled(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.some(isReportValueFilled);
  return !['', 'Ej angivet', 'Ej angiven'].includes(String(value).trim());
}
function reportContent(snapshot, compact = false) {
  const value = name => snapshot.fields.find(([key]) => key === name)?.[1] ?? '';
  const checks = name => [snapshot.fields.filter(([key]) => key === name).map(([, text]) => text).filter(text => !compact || isReportValueFilled(text)).join(', '), ...(name !== 'strukturer' ? [value(`${name}Detalj`)] : [])].filter(text => compact ? isReportValueFilled(text) : Boolean(text)).join(' – ');
  const field = (label, text) => [label, compact ? text : isReportValueFilled(text) ? text : 'Ej angivet'];
  const basic = [['Delområde-ID','delomradeId'],['Namn på delområde','namn'],['Kommun / Ort','kommun'],['Fastighetsbeteckning','fastighet'],['Areal (ha)','areal'],['Inventeringsdatum','datum'],['Polygon (JSON/GeoJSON)','polygonGeojson'],['Mittpunktskoordinat','centerCoordinate'],['Inventerare','inventerare']];
  const groups = pairs => pairs.map(([label, name]) => field(label, checks(name)));
  const report = {
    compact,
    title: isReportValueFilled(value('namn')) ? value('namn') : 'Områdesbeskrivning',
    id: compact && !isReportValueFilled(value('delomradeId')) ? '' : value('delomradeId'),
    meta: compact ? [value('delomradeId'), value('kommun'), value('datum')].filter(isReportValueFilled).join(' · ') : [value('delomradeId') || 'Ej angivet', value('kommun') || 'Ort ej angiven', value('datum') || 'Datum ej angivet'].join(' · '),
    summary: compact ? value('sammanfattning') : value('sammanfattning') || 'Ej angiven',
    scale: 'Förekomstskala: 0 = saknas, 1 = enstaka, 2 = sparsamt, 3 = måttligt, 4 = rikligt. Tomma fält betyder ej angivet/ej bedömt.',
    sections: [
      ['Grunduppgifter', [...basic.map(([label, name]) => field(label, value(name))), ...groups([['Inventeringsmetod','metod'],['Inventeringens täckning','tackning'],['Begränsningar','begransning']])]],
      ['Trädskikt och skogstyp', [...groups([['Skogstyp','skogstyp'],['Trädslag','tradslag'],['Särskilda skogstyper','sarskildSkog'],['Åldersstruktur','aldersstruktur'],['Skiktning','skiktning']]), field('Kommentar trädskikt', value('alderDiameter')), field('Dominerande ålder (år)', value('dominerandeAlder')), ...groups([['Beståndsstruktur','bestandsstruktur']])]],
      ['Naturvärdesträd', nvt.map((label, i) => field(label, value(`nvt${i}`)))],
      ['Terräng & markförhållanden', [...groups(markGroups), field('Kommentar terräng', value('terrangKommentar'))]],
      ['Markvegetation', [...groups([['Vegetationstyp','vegetation'],['Särskilda strukturer','strukturer']]), field('Kommentar markvegetation', value('strukturerDetalj'))]],
      ['Död ved', woodReportFields(snapshot.fields, compact)],
      ['Processer & påverkan', groups([['Naturprocesser','processer'],['Mänsklig påverkan','paaverkan']])],
      ['Noterade naturvårdsarter', compact ? value('naturvardsarter') : value('naturvardsarter') || 'Ej angivet'],
      ['Landskap', groups([['Anslutande värden','anslutande'],['Landskapsekologi','landskap'],['Gränsdragning','grans']])]
    ]
  };
  if (compact) report.sections = report.sections.map(([title, rows]) => [title, Array.isArray(rows) ? rows.filter(([, text]) => isReportValueFilled(text)) : rows]).filter(([, rows]) => Array.isArray(rows) ? rows.length : isReportValueFilled(rows));
  return report;
}

function reportHtml(includeImages, snapshot = protocolData(), compact = false) {
  const report = reportContent(snapshot, compact);
  const esc = escapeHtml;
  const fields = rows => rows.map(([label, text]) => `<div class="report-field"><b>${esc(label)}</b><span>${esc(text)}</span></div>`).join('');
  const figures = includeImages ? Object.keys(imageLabels).filter(id => snapshot.images[id]).map(id => `<figure><img src="${snapshot.images[id]}" alt="${imageLabels[id]}"><figcaption>${imageLabels[id]}</figcaption></figure>`).join('') : '';
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Fältrapport ${esc(report.id)}</title><style>
body{padding:0 16px;overflow-wrap:anywhere;font:14px Arial,sans-serif;color:#17241e;max-width:900px;margin:40px auto;line-height:1.5}
h1{font:600 38px Georgia,serif;margin-bottom:5px}h2{font:600 23px Georgia,serif;border-bottom:2px solid #d9a441;padding-bottom:8px;margin-top:34px;break-after:avoid}
.meta{color:#68746d;margin-bottom:30px}.report-field{display:grid;grid-template-columns:220px 1fr;border-bottom:1px solid #e0e7e0;padding:9px 0;break-inside:avoid}
.report-field b{font-size:12px;text-transform:uppercase;color:#255d4b}.report-field span,p{white-space:pre-wrap}
figure{display:inline-block;width:47%;vertical-align:top;margin:1%;break-inside:avoid}figure img{max-width:100%;max-height:380px;object-fit:contain}figcaption{font-size:12px;color:#68746d}
@media(max-width:600px){.report-field{grid-template-columns:1fr}figure{width:100%;margin:12px 0}}@media print{body{margin:10mm;padding:0}}
</style></head><body><p class="meta">FÄLTRAPPORT · OMRÅDESBESKRIVNING</p><h1>${esc(report.title)}</h1>${report.meta ? `<p class="meta">${esc(report.meta)}</p>` : ''}<p class="meta">${esc(report.scale)}</p>${!compact || isReportValueFilled(report.summary) ? `<h2>Sammanfattning</h2><p>${esc(report.summary)}</p>` : ''}${report.sections.map(([title, rows]) => `<h2>${esc(title)}</h2>${typeof rows === 'string' ? `<p>${esc(rows)}</p>` : fields(rows)}`).join('')}${figures || !compact ? `<h2>Bilder</h2>${figures || (includeImages ? '<p>Inga bilder tillagda.</p>' : '<p>Rapporten exporterades utan bilder.</p>')}` : ''}</body></html>`;
}

async function prepareWordImages(snapshotImages) {
  const prepared = [];
  for (const id of Object.keys(imageLabels)) {
    if (!snapshotImages[id]) continue;
    const img = new Image();
    img.src = snapshotImages[id];
    await img.decode();
    const factor = Math.min(1, 600 / img.naturalWidth, 420 / img.naturalHeight);
    // Convert WebP as well as older imported images to a Word-compatible PNG.
    const canvas = document.createElement('canvas');
    const resolution = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * resolution));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * resolution));
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    prepared.push({label:imageLabels[id], data:canvas.toDataURL('image/png'), width:Math.max(1, Math.round(img.naturalWidth * factor)), height:Math.max(1, Math.round(img.naturalHeight * factor))});
  }
  return prepared;
}

function buildWordDocument(report, preparedImages) {
  if (typeof docx === 'undefined') throw new Error('Word-exporten saknas. Kontrollera att mappen vendor finns bredvid index.html.');
  const {Document, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, HeadingLevel, WidthType, BorderStyle, TableLayoutType, Footer, PageNumber, AlignmentType} = docx;
  // Preserve the report's existing green/gold visual system on A4 pages.
  const pageWidth = 11906, pageHeight = 16838, margin = 1134;
  const width = pageWidth - 2 * margin;
  const columns = [2800, width - 2800];
  const runs = (text, settings = {}) => String(text).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').split(/\r\n|\r|\n/).map((line, index) => new TextRun({text:line, ...settings, ...(index ? {break:1} : {})}));
  const paragraph = (text, settings = {}) => new Paragraph({children:runs(text), ...settings});
  const heading = title => paragraph(title, {heading:HeadingLevel.HEADING_1});
  const noBorder = {style:BorderStyle.NONE, size:0, color:'FFFFFF'};
  const table = rows => new Table({
    width:{size:width, type:WidthType.DXA}, columnWidths:columns,
    layout:TableLayoutType.FIXED, indent:{size:120, type:WidthType.DXA},
    margins:{top:100, bottom:100, left:120, right:120},
    borders:{top:noBorder, bottom:noBorder, left:noBorder, right:noBorder, insideVertical:noBorder, insideHorizontal:{style:BorderStyle.SINGLE, size:4, color:'E0E7E0'}},
    rows:rows.map(([label, text]) => new TableRow({children:[label, text].map((value, index) => new TableCell({
      width:{size:columns[index], type:WidthType.DXA},
      children:[new Paragraph({children:runs(value, index === 0 ? {bold:true, color:'255D4B', size:19} : {}), spacing:{before:0, after:0, line:260}})]
    }))}))
  });
  const children = [
    paragraph('FÄLTRAPPORT · OMRÅDESBESKRIVNING', {style:'ReportMeta'}),
    paragraph(report.title, {heading:HeadingLevel.TITLE}),
    ...(report.meta ? [paragraph(report.meta, {style:'ReportMeta'})] : []),
    paragraph(report.scale, {style:'ReportMeta'}),
    ...(!report.compact || isReportValueFilled(report.summary) ? [heading('Sammanfattning'), paragraph(report.summary)] : [])
  ];
  for (const [title, rows] of report.sections) children.push(heading(title), typeof rows === 'string' ? paragraph(rows) : table(rows));
  if (preparedImages.length || !report.compact) children.push(heading('Bilder'));
  if (!preparedImages.length && !report.compact) children.push(paragraph('Inga bilder tillagda.'));
  for (const image of preparedImages) {
    children.push(new Paragraph({keepNext:true, children:[new ImageRun({type:'png', data:image.data, transformation:{width:image.width, height:image.height}, altText:{title:image.label, description:image.label, name:image.label}})]}));
    children.push(paragraph(image.label, {style:'ReportMeta'}));
  }
  return new Document({
    title:report.title, description:'Fältrapport – områdesbeskrivning', creator:'Fältprotokoll',
    styles:{
      default:{document:{run:{font:'Arial', size:21, color:'17241E', language:{value:'sv-SE'}}, paragraph:{spacing:{before:0, after:120, line:276}, widowControl:true}},
        title:{run:{font:'Georgia', size:48, bold:true, color:'17241E'}, paragraph:{spacing:{before:0, after:160}, keepNext:true}},
        heading1:{run:{font:'Georgia', size:30, bold:true, color:'17241E'}, paragraph:{spacing:{before:320, after:160}, keepNext:true, border:{bottom:{style:BorderStyle.SINGLE, color:'D9A441', size:10, space:6}}}}},
      paragraphStyles:[{id:'ReportMeta', name:'Rapportinformation', basedOn:'Normal', run:{font:'Arial', size:18, color:'68746D'}, paragraph:{spacing:{before:0, after:160, line:240}}}]
    },
    sections:[{properties:{page:{size:{width:pageWidth, height:pageHeight}, margin:{top:margin, bottom:margin, left:margin, right:margin, header:480, footer:480}}},
      footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT, children:[new TextRun({children:['Sida ', PageNumber.CURRENT], size:18, color:'68746D'})]})]})}, children}]
  });
}

async function wordReport(snapshot, compact = false) {
  const preparedImages = await prepareWordImages(snapshot.images);
  const document = buildWordDocument(reportContent(snapshot, compact), preparedImages);
  return docx.Packer.toBlob(document);
}
