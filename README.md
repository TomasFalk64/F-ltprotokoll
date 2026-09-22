# Fältprotokoll

## Syfte och funktion

Fältprotokoll är en webbplats för att snabbt och enkelt dokumentera ett områdes naturvärden i fält eller strax efter ett fältbesök. Formulärets avsnitt, valalternativ och korta skrivstöd hjälper inventeraren att komma ihåg vad som bör noteras och få med relevanta detaljer.

Här kan du beskriva bland annat trädskikt, markvegetation, naturvärdesträd, terräng, död ved, påverkan, artfynd och landskapssamband. Du kan även lägga till kartbilder, foton, koordinater samt kollekt- och DNA-noteringar. Avsnitten är hopfällbara och alla fält är valfria.

Uppgifterna sparas automatiskt lokalt i webbläsaren. Protokollet kan exporteras som en kompakt eller fullständig rapport i Word eller HTML, och som en maskinläsbar JSON-fil för fortsatt bearbetning, exempelvis med datorverktyg eller AI. JSON-filen kan importeras igen för att fortsätta arbetet eller låta en kollega komplettera uppgifterna. Webbplatsen fungerar utan internetanslutning och skickar inte protokolluppgifterna till någon server.

## Kom igång

Öppna `index.html` i webbläsaren. Ingen installation eller internetanslutning behövs. Utkast sparas lokalt; protokoll kan exporteras som JSON, Word och HTML.

För att publicera eller kopiera webbplatsen behövs **`index.html`, `scripts/`, `assets/css/`, `assets/icons/` och `vendor/`**. Behåll mappstrukturen.

| Sökväg | Innehåll |
| --- | --- |
| `index.html` | Webbplatsens startsida och formulär |
| `scripts/` | Formulärlogik, lokal lagring, import och export |
| `assets/css/` | Stilmall |
| `assets/icons/` | Webbplatsikoner i 32, 64 och 180 px |
| `assets/source/` | Ikonoriginal för framtida bearbetning; behövs inte vid publicering |
| `vendor/` | Lokala bibliotek för Word och GeoTIFF, inklusive licenser |
| `tests/` | Automatiska kontroller; behövs inte vid publicering |
| `docs/` | Användarguide och separat protokollspecifikation |

[Användarguide](docs/usage.md) · [Protokolldefinition](docs/protocol/protocol.json)

Projektet är licensierat under [MIT](license.md). Tredjepartsbibliotekens egna licenser finns i `vendor/`.

## Fristående protokoll för andra implementationer

`docs/protocol/` innehåller tre filer för den som vill bygga ett eget formulär, exempelvis i en mobilapp med annan utformning. Webbplatsen läser inte dessa filer vid körning.

- [`protocol.json`](docs/protocol/protocol.json) är den fristående filen att dela. Den beskriver de 11 sektionerna, webbplatsens 66 formulärfält och fyra bildplatser, dödvedsposternas åtta underfält samt datatyper, svarsalternativ, obligatoriskhet och villkor. Den beskriver också exakt hur inventeringar sparas och innehåller svarsschemat i `response_format.schema` samt regler för dödvedsposter i `record_types.deadwood.schema`.
- [`protocol.schema.json`](docs/protocol/protocol.schema.json) är ett extra kontrollverktyg som validerar själva protokolldefinitionen. Det behövs inte för att visa formuläret.
- [`response.example.json`](docs/protocol/response.example.json) är en fiktiv ifylld inventering i samma JSON-format som webbplatsen. Den kan importeras direkt via **Arkiv → Importera JSON**.

Protokolldefinitionen använder nu webbplatsens exakta fältnamn och svarsvärden. En annan implementation kan läsa och skriva samma inventeringsformat utan en separat mappningsfil. Visningstexten (`label`) får översättas, men fältnamnet (`id`) och alternativets lagrade värde (`value`) måste bevaras. Exempelvis kan ”Grandominerad” visas på engelska men ska fortfarande sparas som `"Grandominerad"`.

Svarsfiler har `format: "faltrapport"`, `version: 1`, namn/värde-par i `fields` och bilddata i `images`. Även numeriska fält lagras som strängar. Dödvedsposter lagras som JSON-kodade listor i två strängfält. Följ både de inbäddade schemana och kompletterande regler i `response_format.rules`; enbart schemakontroll räcker exempelvis inte för att kontrollera numeriska steg eller avkoda bilder. De automatiska testerna jämför definitionen med webbplatsens fält och alternativ samt provar exempelfilens import och återexport.

Den nya definitionen har protokollversion **3.0.0** och definitionsformat **2.0.0**. Den ersätter det tidigare upplägget med andra fält-ID:n och ett separat nästlat svarsformat. Webbplatsens exportformat är oförändrat. Det saknar fortfarande protokoll-ID och innehållsversion i själva inventeringsfilen, så för exakt historisk spårbarhet behöver protokolldefinitionen sparas tillsammans med inventeringen. Att bädda in den referensen i webbexporten är en separat ändring som ännu inte är genomförd.

## Kontroller

Kör kontrollerna med Node.js, utan att installera paket:

```sh
node tests/verify.cjs
node tests/verify-spatial.cjs
```

Testerna kontrollerar bland annat alla 66 formulärfält, JSON-export och återimport, HTML/Word, äldre protokoll, rensning och bildkonvertering. Skripten fungerar även om de startas från en annan arbetsmapp. Faktisk webbläsarinteraktion och visuell layout behöver kontrolleras separat.

För att även validera de fristående JSON-schemana och exempelsvarets innehåll:

```sh
python -m pip install --target tests/artifacts/schema-deps "jsonschema[format-nongpl]"
python tests/verify-protocol.py
```

Detta är en separat utvecklingskontroll. Python och validatorn behövs inte för webbplatsen.

`WRITE_DOCX_FIXTURES=1` aktiverar valfria Word-testfiler i `tests/artifacts/`, som inte versionshanteras.
