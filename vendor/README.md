# Offline Word export dependency

`docx-9.5.1.js` is the unmodified browser IIFE bundle from the MIT-licensed
[`docx` project](https://github.com/dolanmiu/docx), pinned to version 9.5.1.
The license is included as `docx-LICENSE`.

Source: https://cdn.jsdelivr.net/npm/docx@9.5.1/dist/index.iife.js

This is bundled locally so opening `index.html` and exporting Word files requires
no network access or build step. The application does not upload report data.

`geotiff-2.1.3.js` is the unmodified browser bundle of the MIT-licensed
[`geotiff.js` project](https://github.com/geotiffjs/geotiff.js/tree/v2.1.3).
License: `geotiff-LICENSE`.
Source: https://cdn.jsdelivr.net/npm/geotiff@2.1.3/dist-browser/geotiff.js

The map decoder uses the first image and runs without a worker pool. No external
requests are needed to decode supported local TIFF files.
