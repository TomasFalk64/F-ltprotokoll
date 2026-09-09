const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const zlib = require('node:zlib');

// Make real, georeferenced TIFFs, including compressed and multi-page inputs.
function tiffFixture(pages) {
  const blocks = [];
  let offset = 8;
  for (const [index, page] of pages.entries()) {
    const width = page.width || 2, height = page.height || 1, bits = page.bits || 8;
    const raw = Buffer.alloc(width * height * 3 * bits / 8);
    for (let pixel = 0; pixel < width * height; pixel++) {
      for (let channel = 0; channel < 3; channel++) {
        const value = page.color[channel];
        if (bits === 16) raw.writeUInt16LE(value, (pixel * 3 + channel) * 2);
        else raw[pixel * 3 + channel] = value;
      }
    }
    const data = page.compressed ? zlib.deflateSync(raw) : raw;
    const count = 11, headerSize = 2 + count * 12 + 4;
    const bitsOffset = offset + headerSize, geoOffset = bitsOffset + 6, dataOffset = geoOffset + 16;
    const length = headerSize + 6 + 16 + data.length;
    const block = Buffer.alloc(length + length % 2);
    block.writeUInt16LE(count);
    const tags = [[256,4,1,width],[257,4,1,height],[258,3,3,bitsOffset],[259,3,1,page.compressed ? 8 : 1],[262,3,1,2],[273,4,1,dataOffset],[277,3,1,3],[278,4,1,height],[279,4,1,data.length],[284,3,1,1],[34735,3,8,geoOffset]];
    tags.forEach(([tag,type,n,value], i) => {
      const pos = 2 + i * 12;
      block.writeUInt16LE(tag,pos); block.writeUInt16LE(type,pos+2); block.writeUInt32LE(n,pos+4); block.writeUInt32LE(value,pos+8);
    });
    block.writeUInt32LE(index === pages.length - 1 ? 0 : offset + block.length, 2 + count * 12);
    [bits,bits,bits].forEach((value,i) => block.writeUInt16LE(value,headerSize+i*2));
    [1,1,0,1,2048,0,1,4326].forEach((value,i) => block.writeUInt16LE(value,headerSize+6+i*2));
    data.copy(block,headerSize+22);
    blocks.push(block); offset += block.length;
  }
  const header = Buffer.from([73,73,42,0,8,0,0,0]);
  const buffer = Buffer.concat([header,...blocks]);
  return buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);
}

async function main() {
  const canvases = [];
  const runtime = vm.createContext({console, Blob, URL, TextDecoder, TextEncoder, setTimeout, clearTimeout, Worker:class {constructor(){throw Error('No workers should be needed');}},
    document:{createElement(){const canvas = {width:0,height:0,getContext(){return {createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(data){canvas.pixels = data.data;},drawImage(){}};},toDataURL(type){canvas.mime = type; return 'data:image/png;base64,dGVzdA==';}}; canvases.push(canvas); return canvas;}},
    Image:class {naturalWidth=3200; naturalHeight=1600; async decode(){}},
  });
  runtime.self = runtime;
  vm.runInContext(fs.readFileSync('vendor/geotiff-2.1.3.js','utf8'),runtime);
  vm.runInContext(fs.readFileSync('spatial-input.js','utf8'),runtime);
  for (const compressed of [false,true]) {
    runtime.buffer = tiffFixture([{color:[255,0,0],compressed},{color:[0,0,255]}]);
    const raster = await vm.runInContext('decodeGeoTiff(buffer)',runtime);
    assert.equal(raster.width,2);
    assert.deepEqual(Array.from(raster.pixels),[255,0,0,255,255,0,0,255], 'Only first TIFF page decoded');
  }
  runtime.buffer = tiffFixture([{color:[65535,0,32768],bits:16,width:3200,height:2}]);
  const scaled = await vm.runInContext('decodeGeoTiff(buffer)',runtime);
  assert.equal(scaled.width,1600); assert.equal(scaled.height,1);
  assert.deepEqual(Array.from(scaled.pixels.slice(0,4)),[255,0,128,255], '16-bit RGB scaled correctly');
  runtime.file = {name:'map.tif',type:'',size:runtime.buffer.byteLength,arrayBuffer:async () => runtime.buffer};
  await vm.runInContext('mapFileToPng(file)',runtime);
  assert.equal(canvases.at(-1).mime,'image/png'); assert.equal(canvases.at(-1).width,1600);
  for (const name of ['map.png','map.jpg']) {
    runtime.file = new Blob(['fixture']); runtime.file.name = name;
    await vm.runInContext('mapFileToPng(file)',runtime);
    assert.equal(canvases.at(-1).mime,'image/png'); assert.equal(canvases.at(-1).width,1600); assert.equal(canvases.at(-1).height,800);
  }
  runtime.file = {name:'map.pdf',size:10,type:'application/pdf'};
  await assert.rejects(vm.runInContext('mapFileToPng(file)',runtime), /GeoTIFF/);
  runtime.buffer = new ArrayBuffer(8);
  await assert.rejects(vm.runInContext('decodeGeoTiff(buffer)',runtime));

  console.log('PASS: real multi-page GeoTIFF, Deflate, 16-bit RGB, 1600px resizing, PNG/JPG path, invalid TIFF/PDF.');
}
main().catch(error => {console.error(error.message); process.exitCode=1;});
