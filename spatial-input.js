let pendingSpatialFiles = 0;

function fitMapSize(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) throw new Error('Kartan har ogiltiga bildmått.');
  const factor = Math.min(1, 1600 / Math.max(width, height));
  return {width:Math.max(1, Math.round(width * factor)), height:Math.max(1, Math.round(height * factor))};
}

async function decodeGeoTiff(buffer) {
  if (typeof GeoTIFF === 'undefined') throw new Error('GeoTIFF-biblioteket saknas i mappen vendor.');
  const tiff = await GeoTIFF.fromArrayBuffer(buffer);
  const image = await tiff.getImage(0);
  const width = image.getWidth(), height = image.getHeight();
  const size = fitMapSize(width, height);
  const tags = image.getFileDirectory();
  // readRGB resamples after decoding: bound the source size as well as the PNG.
  const bytesPerPixel = Array.from(tags.BitsPerSample || [8]).reduce((sum, bits) => sum + Math.ceil(bits / 8), 0);
  if (width * height > 40000000 || width * height * bytesPerPixel > 160000000) throw new Error('GeoTIFF-kartan är för stor att läsa här. Exportera ett mindre utsnitt (högst 40 miljoner pixlar).');
  if (tags.Orientation && tags.Orientation !== 1) throw new Error('Kartans TIFF-orientering stöds inte. Exportera den med normal bildorientering eller som PNG.');
  if (tags.SampleFormat && Array.from(tags.SampleFormat).some(format => format !== 1)) throw new Error('GeoTIFF med höjd-/mätdata stöds inte. Välj en färdig kartbild i RGB, gråskala eller palettfärg.');
  const hasAlpha = tags.PhotometricInterpretation === 2 && image.getSamplesPerPixel() === 4 && [1,2].includes(tags.ExtraSamples?.[0]);
  const channels = hasAlpha ? 4 : 3;
  const rgb = await image.readRGB({...size, interleave:true, resampleMethod:'nearest', enableAlpha:hasAlpha});
  if (rgb.length !== size.width * size.height * channels) throw new Error('Kartans färgkanaler kunde inte läsas.');
  const pixels = new Uint8ClampedArray(size.width * size.height * 4);
  for (let pixel = 0; pixel < size.width * size.height; pixel++) {
    const alpha = hasAlpha ? rgb[pixel * channels + 3] / (2 ** (tags.BitsPerSample?.[3] || 8) - 1) : 1;
    for (let channel = 0; channel < 3; channel++) {
      const bits = tags.PhotometricInterpretation === 2 ? (tags.BitsPerSample?.[channel] || 8) : 8;
      const premultiplied = hasAlpha && tags.ExtraSamples[0] === 1 && alpha > 0 ? alpha : 1;
      pixels[pixel * 4 + channel] = Math.round(rgb[pixel * channels + channel] * 255 / (2 ** bits - 1) / premultiplied);
    }
    pixels[pixel * 4 + 3] = Math.round(alpha * 255);
  }
  return {...size, pixels};
}

async function mapFileToPng(file) {
  if (file.size > 100 * 1024 * 1024) throw new Error('Kartfilen får vara högst 100 MB.');
  const isTiff = /\.(tif|tiff)$/i.test(file.name) || /^(image\/(tiff|geotiff)|application\/geotiff)$/i.test(file.type);
  const canvas = document.createElement('canvas');
  if (isTiff) {
    const raster = await decodeGeoTiff(await file.arrayBuffer());
    canvas.width = raster.width;
    canvas.height = raster.height;
    const context = canvas.getContext('2d');
    const imageData = context.createImageData(raster.width, raster.height);
    imageData.data.set(raster.pixels);
    context.putImageData(imageData, 0, 0);
  } else {
    if (!/^image\/(png|jpeg)$/i.test(file.type) && !/\.(png|jpe?g)$/i.test(file.name)) throw new Error('Välj GeoTIFF/TIFF, PNG eller JPG för kartbilden.');
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const size = fitMapSize(img.naturalWidth, img.naturalHeight);
      canvas.width = size.width;
      canvas.height = size.height;
      canvas.getContext('2d').drawImage(img, 0, 0, size.width, size.height);
    } finally { URL.revokeObjectURL(url); }
  }
  return canvas.toDataURL('image/png');
}

let importedPolygonText = null;
let polygonImportVersion = 0;
function updatePolygonStatus() {
  const field = [...form.querySelectorAll('[name]')].find(control => control.name === 'polygonGeojson');
  if (field?.value !== importedPolygonText) importedPolygonText = null;
  document.querySelector('#polygonImportStatus').textContent = importedPolygonText ? 'Polygon importerad' : '';
  document.querySelector('#removePolygon').hidden = !field?.value;
}
function markPolygonImported() {
  importedPolygonText = [...form.querySelectorAll('[name]')].find(control => control.name === 'polygonGeojson')?.value || null;
  updatePolygonStatus();
}
function setupPolygonImport() {
  const input = document.querySelector('#polygonFile');
  document.querySelector('#polygonImportButton').addEventListener('click', () => input.click());
  const field = document.querySelector('[name="polygonGeojson"]');
  document.querySelector('#removePolygon').addEventListener('click', () => {
    polygonImportVersion++;
    field.value = '';
    importedPolygonText = null;
    saveDraft();
    setStatus('Polygonen har tagits bort.');
    field.focus();
  });
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    const generation = imageGeneration;
    const version = polygonImportVersion;
    const previousValue = field.value;
    pendingSpatialFiles++;
    input.disabled = true;
    try {
      if (file.size > 1024 * 1024) throw new Error('JSON-filen får vara högst 1 MB.');
      const value = (await file.text()).replace(/^\uFEFF/, '');
      try { JSON.parse(value); } catch { throw new Error('Filen är inte giltig JSON/GeoJSON.'); }
      if (value.length > 100000) throw new Error('Polygontexten får vara högst 100 000 tecken.');
      if (generation !== imageGeneration || version !== polygonImportVersion || field.value !== previousValue) return;
      field.value = value;
      saveDraft();
      markPolygonImported();
      setStatus('Polygonen har importerats.');
    } catch (error) {
      if (generation === imageGeneration) setStatus(`Polygonen kunde inte importeras. ${error.message}`);
    } finally {
      pendingSpatialFiles--;
      input.disabled = false;
      input.value = '';
    }
  });
}
