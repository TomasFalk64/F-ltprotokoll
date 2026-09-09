# Fältprotokoll

Öppna `index.html` i en webbläsare. Behåll `app.js`, `report-export.js`, `protocol-transfer.js`, `styles.css` och mappen `vendor` tillsammans med sidan. Formuläret utgår från `Faltrapport_1.txt` och fungerar utan nätanslutning.

- Alla fält är valfria. Tom förekomst betyder ej bedömt; 0 betyder konstaterad frånvaro. Procenttalet visar besvarade fält, inte rapportens kvalitet eller fullständighet.
- Kryssval tillåter flera svar, exempelvis när olika delar av området har olika egenskaper. Ange kompletteringar i fritextfälten.
- För död ved finns trädslag, förekomst, grovlek och mikroklimat per typ. Använd kommentaren för att skilja uppgifterna åt mellan olika trädslag.
- Utkast och bilder sparas lokalt och återställs i samma webbläsare på samma adress. Webbläsarens inställningar, privat läge och lagringsutrymme kan begränsa sparandet; meddelandet ovanför formuläret visar om det misslyckas. Nedladdade rapportfiler är en separat kopia.
- Kartbild och foton stöds i JPEG, PNG och WebP. De sparas som JPEG med högst 1600 pixlar på längsta sidan. Behåll originalbilder separat om full upplösning behövs.
- **Spara** i topbaren skapar tre filer från samma ögonblicksbild: `.json` (redigerbart protokoll inklusive bilder), `.docx` (Word-rapport med bilder) och `.html` (fristående rapport med bilder). Webbläsaren kan be dig tillåta flera nedladdningar. Separata länkar till senast skapade filer visas också ovanför formuläret och finns kvar tills du sparar igen eller lämnar sidan.
- **Importera** öppnar JSON-filen och ersätter formulärets uppgifter och bilder. Om du har ändringar som inte exporterats visas en varning: OK fortsätter till filvalet, Avbryt låter dig gå tillbaka och spara. Även ett återställt lokalt utkast skyddas av varningen. Om du ändrar formuläret medan filen läses visas varningen igen före ersättningen.
- Filformat, version, fält och bilder kontrolleras innan importen genomförs. Felaktiga filer lämnar formuläret oförändrat. Högsta filstorlek är 30 MB. Importen sker lokalt i webbläsaren.
- Skicka JSON-filen till en kollega som ska komplettera protokollet. Word- och HTML-filer är rapportkopior; ändringar i dem läses inte tillbaka till formuläret.
- Knapparna **HTML utan bilder** och **HTML med bilder** längst ned exporterar enbart HTML. Export utan bilder behåller bilderna i utkastet.
- Word-exporten använder A4, rapportens gröna/guldgula färger, rubriker, tabeller och inbäddade bilder med bibehållna proportioner. Sidbrytningar kan variera mellan ordbehandlare. HTML-filen kan öppnas, delas och skrivas ut utan projektfilerna.

JSON-formatet har `format: "faltrapport"`, `version: 1`, `fields` som en lista med namn/värde-par och `images` som inbäddade data-URL:er. Exporten innehåller även `savedAt`. Okända versioner eller fält avvisas för att undvika att information tappas bort.

Kontroller: `node --check app.js`, `node --check report-export.js`, `node --check protocol-transfer.js` och `node verify.cjs`. Inga installationer behövs. Regressionstestet kontrollerar formulärmodellen, JSON-återimport, varningar, felhantering, samtidiga ändringar och tre filnedladdningar. Det kör även det lokala Word-biblioteket och kontrollerar den genererade DOCX-filens text, tabellmått, formatering och inbäddade bilder. Visuell layout, faktiska nedladdningar och bildavkodning behöver också kontrolleras i en webbläsare/ordbehandlare.
