# Inventeringsprotokoll – protokollspråk 1.0.0

Denna katalog definierar vad som ska registreras i en inventering, oberoende av vilken klient som samlar in uppgifterna. Den befintliga webbapplikationen läser ännu inte dessa filer.

## Filer och ansvar

| Fil | Innehåll |
| --- | --- |
| `protocol.schema.json` | JSON Schema för att validera protokolldefinitionens struktur. |
| `protocol.json` | Protokollet **Fältrapport – områdesbeskrivning**, version 1.0.0. |
| `response.schema.json` | Generellt JSON Schema för en ifylld inventerings struktur och inbäddade resurser. |
| `response.example.json` | Fiktiv inventering enligt svarsformatet och det medföljande protokollet. |
| `README.md` | Språkets betydelse, tolkningsregler, exempel och koppling till nuvarande formulär. |

Schemat använder [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12). Det ska appliceras på `protocol.json`, inte på en ifylld inventering. Datumformat behöver kontrolleras med validatorns formatkontroll aktiverad; `format` innebär inte alltid en automatisk formatkontroll. Se [JSON Schemas typ- och formatdokumentation](https://json-schema.org/understanding-json-schema/reference/type).

Formatet är ett lokalt definierat protokollspråk, inte en etablerad inventeringsstandard. De semantiska reglerna nedan är en del av specifikationen. En framtida formulärgenerator behöver både JSON Schema-validering och semantisk kontroll.

## Principer

- ID:n är stabila tekniska identifierare. Etiketter får ändras eller översättas utan att svarens identitet ändras.
- Sektioner och grupper uttrycker informationens sammanhang. Deras ordning är protokollets läsordning, inte en anvisning om kolumner, kort eller placering.
- Fältdefinitioner, svarsalternativ, villkor, validering och metadata hålls åtskilda och kopplas samman med ID-referenser.
- Villkor är data. De innehåller inga skript och ska inte köras med `eval`.
- Färger, CSS, widgetval, filöverföring, bildkonvertering, exportformat och lokal lagring ingår inte.
- `description` är saklig hjälptext. Platshållare, knappar och övriga presentationsegenskaper ingår inte.
- Protokolldefinition och inventeringssvar är olika dokument. Appens befintliga JSON-export är inte detta protokollformat och får inte importeras som en protokolldefinition.

## Dokumentets huvuddelar

Alla sju huvuddelar är obligatoriska. Listorna `option_sets`, `conditions` och `validation` får vara tomma. Okända egenskaper avvisas av schemat, så att exempelvis `widget` eller `css` inte råkar bli en del av språket.

| Nyckel | Betydelse |
| --- | --- |
| `format_version` | Protokollspråkets version; detta schema stöder exakt `1.0.0`. |
| `metadata` | Identitet, beskrivning, språk, protokollversion och tidsstämplar. |
| `structure` | Lista av sektioner med grupper och fältreferenser. |
| `fields` | Register över fältdefinitioner. |
| `option_sets` | Register över återanvändbara alternativmängder. |
| `conditions` | Register över namngivna villkor. |
| `validation` | Register över återanvändbara valideringsregler. |

`metadata` innehåller `protocol_id`, `name`, `version`, `description`, `language`, `created_at` och `updated_at`. Tidsstämplarna är RFC 3339-datum med klockslag och tidszon, exempelvis `2026-09-10T12:00:00Z`. De beskriver definitionen, inte inventeringens datum. `language` använder språktaggar som `sv` eller `sv-SE`; version 1 stöder taggarnas enkla form enligt schemats mönster.

## ID:n och referenser

Alla ID:n följer `^[a-z][a-z0-9_]*$`. Definitionernas ID:n ska vara globalt unika inom protokollet: sektioner, grupper, fält, alternativmängder, alternativ, villkor och regler får inte dela ID. `protocol_id` identifierar hela protokollet.

Referenser är typade genom egenskapens namn: `field_ref` pekar på ett fält, `option_set` på en alternativmängd, `applicable_when` och `required_when` på villkor, samt `validation_refs` på regler. `source.field_id` pekar på ett fält. Etiketter och alternativens eventuella numeriska `code` används aldrig som referenser eller svarens nycklar.

Ett fält får refereras från flera skilda datakontexter. De åtta vedfälten delas exempelvis mellan liggande och stående död ved. Definitionens ID är detsamma, men svaren identifieras av gruppens sökväg, postens identitet och fältets ID. Samma fält får inte förekomma två gånger i samma svarskontext. En `field_ref` är en användning av en definition och får därför inget eget ID.

## Sektioner, grupper och upprepning

En sektion har `id`, `kind: "section"`, `label` och `children`. En grupp har dessutom `kind: "group"` och `repeatable`. Båda kan ha `description` och `applicable_when`.

`children` innehåller grupper eller objekt med enbart `field_ref`. Grupper kan nästlas. Sektioner ligger på dokumentets översta strukturnivå.

En grupp med `repeatable: false` beskriver ett sammanhang utan att skapa en lista av poster. En grupp med `repeatable: true` beskriver en lista där varje post har samma innehåll. `min_records` har implicit värde 0 och utelämnat `max_records` betyder att protokollet inte anger någon övre gräns. Egenskaperna får bara anges på upprepningsbara grupper. Minimiantalet får inte överstiga maximiantalet.

Exempel: en kommentar till hela den liggande döda veden ligger utanför de upprepade posterna:

```json
{
  "id": "deadwood_lying",
  "kind": "group",
  "label": "Liggande död ved",
  "repeatable": false,
  "children": [
    {
      "id": "deadwood_lying_records",
      "kind": "group",
      "label": "Poster per trädslag",
      "repeatable": true,
      "min_records": 0,
      "children": [
        { "field_ref": "wood_species" },
        { "field_ref": "wood_occurrence" }
      ]
    },
    { "field_ref": "deadwood_comment_lying" }
  ]
}
```

Detta är ett förkortat utdrag. Fullständiga postdefinitioner finns i `protocol.json`. Varje faktisk post har en egen beständig identitet enligt svarsformatet nedan; listindex är inte en beständig postidentitet. Formatet kräver inte unika trädslag mellan poster, eftersom den nuvarande appen inte gör det.

## Fält och datatyper

Varje fält har `id`, `label`, `type` och `required`. Valfria egenskaper är `description`, `unit`, `default`, `applicable_when`, `required_when` och `validation_refs`, samt typens särskilda egenskaper.

```json
{
  "id": "deadwood_comment_lying",
  "label": "Kommentar – liggande död ved",
  "type": "text",
  "required": false
}
```

| `type` | Svarsvärde och särskilda egenskaper |
| --- | --- |
| `text` | JSON-sträng; radbrytningar är tillåtna. |
| `integer` | JSON-tal med heltalsvärde. |
| `decimal` | JSON-tal; precision kan begränsas av `multiple_of`. |
| `boolean` | JSON-värdet `true` eller `false`, aldrig texten `"true"`. |
| `date` | Giltigt kalenderdatum som `YYYY-MM-DD`. |
| `enum` | Ett alternativ-ID som sträng; kräver `option_set`. |
| `multienum` | Lista med unika alternativ-ID:n; kräver `option_set`. Ordningen saknar betydelse. |
| `object` | Objekt vars egenskaper är fält-ID:n; kräver `properties`, en lista av fältreferenser. Okända svarsnycklar är ogiltiga. |
| `array` | Lista med värden enligt `items`, en rekursiv värdedefinition. Ordningen bevaras. |
| `coordinate` | Objekt med `crs`, `x`, `y` och eventuellt `z`; kräver `coordinate_systems`. |
| `attachment` | Objekt med en icke-tom `resource_id`; kräver `attachment_kind`. |

`items` beskriver `type` och typens egenskaper, men har inget eget fält-ID, `label` eller `required`. En array av objekt använder `items.type: "object"` och fältreferenser i `items.properties`. `object` och `array` används för sammansatta fältvärden; en upprepningsbar grupp används när flera separata inventeringsfält bildar poster.

`coordinate_systems` är en lista av tillåtna CRS-identifierare. Ett koordinatsvar måste ha en `crs` som finns i listan samt ändliga tal för `x`, `y` och eventuellt `z`. `x` är östlig koordinat/longitud och `y` nordlig koordinat/latitud; klienten får inte byta ordning beroende på presentation. Geografiska gränser och transformationer följer inte automatiskt av datatypen. `attachment_kind` är `image`, `document`, `audio`, `video` eller `any`. Bilagans innehåll och resursidentifierarens upplösning hanteras utanför protokollet.

`unit` är en maskinläsbar enhetskod. Det nuvarande protokollet använder `ha` för hektar och `a` för år. Ett värde uttrycks alltid i fältets angivna enhet; en klient kan visa en annan enhet om den omvandlar korrekt. Villkorade enheter ingår inte i version 1.

`default` är ett frivilligt föreslaget startvärde av rätt datatyp. Det får inte användas för att fylla i saknade historiska svar vid import, ersätta ett befintligt svar eller uppfylla `required` utan att värdet faktiskt finns i inventeringen. Villkor och validering gäller även standardvärden. Det aktuella protokollet har inga förvalda inventeringssvar.

### Tomt, frivilligt och ej bedömt

Saknad nyckel och `null` betyder obesvarat. Tom text, text med enbart blanktecken samt tomma listor räknas också som obesvarade vid `required` och `answered`. Ett objekt är besvarat om minst ett definierat underfält är besvarat. Ett koordinat- eller bilagevärde måste dessutom ha giltig struktur.

`0` och `false` är besvarade värden. Ett alternativ som betyder ”Saknas” är också besvarat. Ett explicit ”Ej bedömt” måste ha ett eget alternativ-ID om det ska kunna skiljas från ett uteblivet svar. Etiketten ”Ej angivet” har ingen särskild betydelse i protokollspråket; inga svenska texter ska fungera som tekniska tomvärden.

`required: true` innebär att ett tillämpligt fält måste vara besvarat. `required_when` kan göra ett annars frivilligt fält obligatoriskt när villkoret är sant. Effektivt krav är `required OR required_when`, men bara när fältet och dess överordnade struktur är tillämpliga. Krav på posternas fält skapar inte i sig några poster; det styrs av `min_records`.

## Alternativmängder

En alternativmängd har `id`, `label` och `options`. Varje alternativ har `id`, `label` och eventuellt `description`, `code` och `applicable_when`. `code` är en semantisk kod, exempelvis förekomstskalans tal 0–4, och ersätter inte alternativets ID.

```json
{
  "id": "occurrence_options",
  "label": "Förekomst",
  "options": [
    { "id": "occurrence_options_absent", "label": "Saknas", "code": 0 },
    { "id": "occurrence_options_isolated", "label": "Enstaka", "code": 1 }
  ]
}
```

Utdraget visar två alternativ; det faktiska protokollet har hela skalan. Ett enumsvar är exempelvis `"occurrence_options_absent"`, och ett flerval är exempelvis `["wood_hollow", "wood_kelo_silver"]`. `multienum` uttrycker flerval utan en separat, potentiellt motsägande `multiple`-flagga.

Ett fält kan bara referera till en alternativmängd i version 1. Den mängden kan innehålla hur många generella och villkorade alternativ som helst. Den tillåtna mängden är unionen av alternativ utan villkor och alternativ vars villkor är sant. Reglerna ersätter aldrig hela alternativmängden.

## Villkor och beroenden

Ett villkor har `id`, eventuellt `description` och en `expression`. `applicable_when` anger tillämplighet för sektion, grupp, fält eller alternativ. `required_when` anger villkorad obligatoriskhet för ett fält.

```json
{
  "id": "wood_is_pine",
  "expression": {
    "op": "equals",
    "source": { "scope": "record", "field_id": "wood_species" },
    "value": "wood_species_options_pine"
  }
}
```

Alternativet kan då definieras så här:

```json
{
  "id": "wood_kelo_silver",
  "label": "Keloved/silverved",
  "applicable_when": "wood_is_pine"
}
```

`wood_hollow` och `wood_fire_affected` saknar villkor. Därför är de tillåtna för alla trädslag, även innan ett trädslag har angetts. Tall ger dessutom keloved/silverved, kådindränkt och törskatepräglad; gran ger dessutom barkborrepräglad. Alternativets villkor utvärderas i det användande fältets kontext, inte i alternativregistrets kontext.

### Kontexter

- `root` söker ett entydigt fält i inventeringens kontext utanför upprepade poster och objektfält. Vanliga sektioner och icke-upprepade grupper skapar inte en ny kontext.
- `record` söker i den närmaste upprepade posten eller det närmaste objektfältets värde. Vanliga grupper inom posten är genomskinliga. Inuti ett objekt som ligger i en upprepad post avser `record` objektet, inte den yttre posten.
- Ett villkor på en upprepningsbar grupp utvärderas i dess omgivande kontext innan dess poster skapas. Villkor på posternas fält utvärderas för varje post separat.
- `record` utan en sådan kontext och referenser till andra posters fält är definitionsfel. Version 1 har inga indexreferenser, föräldrasökvägar eller aggregat över poster.

### Operatorer

| Operator | Egenskaper | Betydelse |
| --- | --- | --- |
| `equals` | `source`, `value` | Typstrikt jämförelse med ett skalärt värde eller alternativ-ID. |
| `contains` | `source`, `value` | Typstrikt medlemskap i ett flerval eller en lista av skalära värden. Inte textsökning. |
| `gt`, `gte`, `lt`, `lte` | `source`, `value` | Numerisk jämförelse med en numerisk konstant. |
| `answered` | `source` | Om källfältet är besvarat enligt tomvärdesreglerna. |
| `all`, `any` | `args` | Alla respektive minst ett av de inbäddade uttrycken. Listan får inte vara tom. |
| `not` | `arg` | Negation av ett inbäddat uttryck. |

Jämförelser mot obesvarade källor ger **okänt**, inte sant eller falskt. `answered` ger däremot falskt för en obesvarad källa. `not(okänt)` är okänt. `all` ger falskt om någon del är falsk, sant om alla är sanna, annars okänt. `any` ger sant om någon del är sann, falskt om alla är falska, annars okänt. Endast sant aktiverar tillämplighet eller ett villkorat krav. Detta undviker exempelvis att `not equals pine` blir sant innan trädslag valts.

Källor som själva är otillämpliga behandlas som obesvarade. Ogiltig datatyp är ett valideringsfel och får inte typkonverteras för att få ett villkor att bli sant. Beroenden härleds ur `source`, `applicable_when` och `required_when`; en separat lista med samma beroenden skulle kunna motsäga uttrycken och ingår därför inte.

Exempel på kombination, här som ett fristående uttryck:

```json
{
  "op": "all",
  "args": [
    {
      "op": "equals",
      "source": { "scope": "record", "field_id": "wood_species" },
      "value": "wood_species_options_pine"
    },
    {
      "op": "contains",
      "source": { "scope": "record", "field_id": "wood_character" },
      "value": "wood_hollow"
    }
  ]
}
```

En klient bestämmer hur otillämpliga fält presenteras. Om en ändring gör ett befintligt svar otillåtet är svaret ogiltigt och behöver hanteras av klienten. Språket föreskriver inte automatisk radering. Applicerbarheten ärvs från överordnade sektioner, grupper och objektfält.

## Validering

Fält och grupper refererar till regler genom `validation_refs`. En regel har `id` och `kind` samt följande egenskaper:

| `kind` | Egenskaper | Gäller |
| --- | --- | --- |
| `number` | `minimum`, `maximum`, `multiple_of` | `integer` och `decimal`. |
| `text` | `min_length`, `max_length`, `pattern` | `text`; längd räknas i Unicode-kodpunkter. Mönster följer JSON Schemas reguljära uttryck. |
| `collection` | `min_items`, `max_items`, `unique_items` | `array`, `multienum` eller en upprepningsbar grupp. |
| `assertion` | `expression`, `message` | Ett fälts eller en grupps omgivande svarskontext. |

Utelämnade gränser är obegränsade. Alla angivna regler måste uppfyllas. `multiple_of` är en matematisk decimalregel; en implementation får inte förkasta exempelvis 0,29 på grund av binära flyttalsavrundningar. `unique_items` jämför hela JSON-värden strukturellt; det innebär inte unikhet på ett enskilt underfält.

En `assertion` måste ge sant för att vara uppfylld. Okänt betyder att den ännu inte kan godkännas. På fält utvärderas regler bara när fältet är tillämpligt och besvarat; obligatoriskhet kontrolleras separat. En gruppregel gäller när gruppen är tillämplig. En collection-regel på en upprepningsbar grupp gäller hela dess lista; en assertion på gruppen gäller dess omgivning, inte varje post. Lägg postberoende assertioner på ett tillämpligt, besvarat fält i posten eller en vanlig undergrupp om de ska prövas per post.

```json
{
  "id": "area_precision",
  "kind": "number",
  "minimum": 0,
  "multiple_of": 0.01
}
```

```json
{
  "id": "area_hectares",
  "label": "Areal",
  "type": "decimal",
  "required": false,
  "unit": "ha",
  "validation_refs": ["area_precision"]
}
```

Schemat kontrollerar definitionens struktur, tillåtna egenskaper och datatyper. En semantisk kontroll måste dessutom kontrollera:

1. Globalt unika ID:n och att alla referenser finns och har rätt objekttyp.
2. Att alla definierade fält används och att fältreferenser är entydiga i varje svarskontext.
3. Att objektdefinitioner inte innehåller rekursiva referenscykler och att villkorens beroenden inte bildar cykler, inklusive indirekta beroenden via överordnade grupper eller villkorade alternativ.
4. Att `record` och `root` går att upplösa på varje plats där ett villkor används.
5. Att jämförelsevärden matchar källfältets datatyp, att enumvärden är giltiga ID:n och att numeriska operatorer används på numeriska fält.
6. Att regler matchar fältets typ, att minimum inte överstiger maximum och att gruppens kardinalitetsregler inte motsäger varandra.
7. Att standardvärden har rätt typ och uppfyller tillämpliga regler. Ett villkorat alternativ får inte vara ovillkorligt standardvärde om dess tillämplighet inte kan säkerställas.
8. Att tidsstämplarna är giltiga och `updated_at` inte ligger före `created_at`.

En framtida klient måste avvisa ett protokoll som den inte kan tolka, i stället för att ignorera okända regler. Ett utkast kan innehålla obesvarade eller ogiltiga svar, men får då inte beskrivas som en validerad inventering.

## Versionering

`format_version` och `metadata.version` använder `MAJOR.MINOR.PATCH` utan suffix i version 1.

- `format_version` ändras när själva språket eller dess tolkningsregler ändras. Detta schema accepterar bara språkversion 1.0.0; stöd för en ny version ska vara uttryckligt.
- `metadata.version` ändras när det enskilda protokollet ändras. PATCH avser etiketter eller förklaringar utan ändrad betydelse, MINOR bakåtkompatibla tillägg som frivilliga fält och alternativ, MAJOR ändrade datatyper, borttagna alternativ, ändrad betydelse eller skärpta krav som kan göra tidigare giltiga svar ogiltiga.
- Ett ID får aldrig återanvändas för en annan betydelse. Gamla publicerade versioner ska bevaras, och importer ska knytas till exakt version.
- `created_at` behålls för samma protokollidentitet. `updated_at` ändras när definitionen revideras. En redan publicerad versions innehåll ändras inte på plats.

Svarsdokumentet anger `protocol_id`, `protocol_version` och `response_format_version` enligt avsnittet nedan. Svarsformatets version är oberoende av både protokollspråkets och det enskilda protokollets version. Migreringsprogram och formulärgenerator ingår inte. Appens befintliga export har fortfarande sitt tidigare format och versionsnummer och har inte ändrats till det nya svarsformatet.

## Kartläggning av det aktuella formuläret

`protocol.json` innehåller 11 sektioner, 60 fältdefinitioner, 27 alternativmängder med 127 alternativ och tre villkor. De åtta vedfälten används i två skilda upprepningsbara grupper. Alla fält har `required: false`.

Etiketter och alternativ har hämtats från `index.html`, `app.js` och `deadwood.js`. Nedanstående tabell dokumenterar gamla tekniska nycklar utan att lägga klientens lagringsdetaljer i protokollet.

| Nuvarande nyckel | Fält-ID i protokollet |
| --- | --- |
| `sammanfattning` | `summary` |
| `mapImage` | `map_image` |
| `delomradeId` | `area_id` |
| `namn` | `area_name` |
| `kommun` | `municipality` |
| `fastighet` | `property_designation` |
| `areal` | `area_hectares` |
| `datum` | `survey_date` |
| `polygonGeojson` | `polygon_text` |
| `centerCoordinate` | `center_coordinate_text` |
| `inventerare` | `surveyor` |
| `metod` | `survey_method` |
| `metodDetalj` | `survey_method_comment` |
| `tackning` | `survey_coverage` |
| `begransning` | `survey_limitations` |
| `begransningDetalj` | `survey_limitations_comment` |
| `skogstyp` | `forest_type` |
| `tradslag` | `canopy_species` |
| `tradslagDetalj` | `canopy_species_other` |
| `sarskildSkog` | `special_forest_types` |
| `aldersstruktur` | `age_structure` |
| `skiktning` | `canopy_layers` |
| `alderDiameter` | `tree_layer_comment` |
| `dominerandeAlder` | `dominant_age` |
| `nvt0` | `old_conifers` |
| `nvt1` | `valuable_deciduous` |
| `nvt2` | `large_trees` |
| `nvt3` | `hollow_trees` |
| `nvt4` | `damaged_trees` |
| `nvt5` | `lichen_moss_trees` |
| `nvt6` | `slow_growing_spruce` |
| `bestandsstruktur` | `stand_structure` |
| `topografi` | `topography` |
| `jordart` | `soil_type` |
| `markfuktighet` | `soil_moisture` |
| `hydrologi` | `hydrology` |
| `markkemi` | `soil_chemistry` |
| `terrangKommentar` | `terrain_comment` |
| `vegetation` | `vegetation_type` |
| `strukturer` | `special_structures` |
| `strukturerDetalj` | `ground_vegetation_comment` |
| `ved_liggande` / `ved_staende`, postens `tradslag` | `wood_species` |
| samma post, `annatTradslag` | `wood_species_other` |
| samma post, `forekomst` | `wood_occurrence` |
| samma post, `grovlek` | `wood_size` |
| samma post, `nedbrytning` | `wood_decay` |
| samma post, `karaktar` | `wood_character` |
| samma post, `annat` | `wood_character_other` |
| samma post, `klimat` | `wood_microclimate` |
| `ved_liggande_kommentar` | `deadwood_comment_lying` |
| `ved_staende_kommentar` | `deadwood_comment_standing` |
| `processer` | `natural_processes` |
| `paaverkan` | `human_impact` |
| `naturvardsarter` | `conservation_species_notes` |
| `anslutande` | `adjacent_values` |
| `landskap` | `landscape_ecology` |
| `grans` | `boundary_basis` |
| `image1` | `stand_overview_image` |
| `image2` | `habitat_feature_image` |
| `image3` | `extra_documentation_image` |

### Medvetna avgränsningar vid kartläggningen

- De 21 nuvarande kryssgrupperna är `multienum`, även metod, täckning, skogstyp och skiktning. Inga nya exklusivitetsregler läggs till för exempelvis ”Inga betydande” tillsammans med en begränsning.
- Naturvärdesträdens numeriska förekomstvärden 0–4 och dödvedens textetiketter motsvarar samma fem alternativ-ID:n. `code` bevarar skalans betydelse. Etiketterna för naturvärdesträd får därför samma normaliserade kapitalisering som för död ved.
- Appens tomma förekomstval visas som ”Ej bedömt” respektive ”–”, men lagras som tom sträng. Den historiska skillnaden mellan ett medvetet ej bedömt och ett obesvarat fält går inte att återskapa. Första protokollet inför inte ett nytt svarsalternativ som inte finns lagrat idag. Ett framtida explicit `not_assessed` måste läggas till i en ny protokollversion.
- Polygon och mittpunkt är text utan geografisk validering. Språkets `coordinate` stöds som generell typ men används inte för att omtolka dessa fält.
- ”Annan vedkaraktär” är ett självständigt textfält. Det finns inget alternativ ”Annat” i vedkaraktärens alternativmängd. ”Ange trädslag” är däremot tillämpligt när trädslag är ”Annat”.
- Metodkommentar, begränsningskommentar och övriga trädslag är alltid tillämpliga och frivilliga, precis som i appen.
- Kartbilden och de tre dokumentationsbilderna har separata semantiska roller. MIME-listor, pixelgränser, TIFF-konvertering och lagring som data-URL:er är klientdetaljer och finns inte i `protocol.json`.
- Appens 100-postersgräns, filstorleksgränser och generella importgränser för text är tekniska begränsningar. De införs inte som ekologiska protokollregler. Språket kan uttrycka maxantal och textgränser när sådana är beslutade.
- Areal har minsta värde 0 och steg 0,01; dominerande ålder är ett icke-negativt heltal. Dessa befintliga fältregler bevaras.
- Naturvårdsarter förblir ett fritextfält. En strukturerad artlista eller koppling till en taxonomisk katalog är en framtida protokolländring.
- Spara-dialogens formatval och Kompakt/Fullständig, formulärets ifyllnadsprocent, importstatus och knappar är inte inventeringsdata och saknar därför fält i protokollet.

## Gemensamt svarsformat 1.0.0

`response.schema.json` beskriver en inventering som ett fristående JSON-dokument. Samma svarsschema används för olika protokoll. Vilka fält, grupper, datatyper och alternativ som är giltiga avgörs dessutom av den exakta protokolldefinition som svaret refererar till. **Godkänd validering mot svarsschemat ensam betyder därför inte att svaren följer protokollet.**

### Identitet och metadata

Alla huvudegenskaper är obligatoriska:

| Egenskap | Betydelse |
| --- | --- |
| `response_format_version` | Exakt `1.0.0` för detta svarsschema. |
| `response_id` | Beständigt UUID för inventeringen, med gemener. |
| `protocol_id` | Måste motsvara `protocol.metadata.protocol_id`. |
| `protocol_version` | Måste motsvara `protocol.metadata.version` exakt. |
| `created_at` | När inventeringsdokumentet skapades. |
| `updated_at` | När dess innehåll senast ändrades; får inte ligga före `created_at`. |
| `answers` | Svarsträd med sektionernas ID:n som nycklar. |
| `resources` | Register över inbäddade bilagor; `{}` när bilagor saknas. |

Tidsstämplar använder samma datumformat som protokollmetadata. Inventeringsdatumet är fortfarande ett eget svarsfält. `response_id` behålls när samma inventering redigeras, exporteras eller importeras. En ny inventering får ett nytt UUID. Svarsformatets version ändras när lagringsstrukturen eller dess tolkningsregler ändras; den ska inte ändras bara för att ett nytt inventeringsprotokoll används.

### Entydigt svarsträd

`answers` är ett objekt där varje nyckel är ett sektions-ID från `protocol.structure`. Varje sektion och icke-upprepningsbar grupp lagras som ett objekt med exakt `fields` och `groups`. Båda finns alltid, även när de är `{}`.

- `fields` kopplar direkta `field_ref`-barn till deras svarsvärden.
- `groups` kopplar direkta gruppbarn till deras innehåll.
- En grupp med `repeatable: false` lagras som ett objekt med `fields` och `groups`.
- En grupp med `repeatable: true` lagras som en lista av poster. Varje post innehåller `record_id`, `fields` och `groups`.
- `record_id` är ett beständigt UUID med gemener och ska vara unikt bland alla poster i inventeringen, även i nästlade grupper. Omordning ändrar inte post-ID:n. En kopierad post som blir en ny observation får ett nytt ID.
- Alla fält och grupper måste ligga på exakt den plats där protokollet definierar dem. Ett känt fält-ID på fel sökväg är också ett fel.

Följande är ett utdrag ur ett svarsträd för liggande död ved:

```json
{
  "deadwood": {
    "fields": {},
    "groups": {
      "deadwood_lying": {
        "fields": {
          "deadwood_comment_lying": "Tallved i öppna lägen."
        },
        "groups": {
          "deadwood_lying_records": [
            {
              "record_id": "27c109c0-e981-4fc7-ad67-7f0669ebfda1",
              "fields": {
                "wood_species": "wood_species_options_pine",
                "wood_character": ["wood_hollow", "wood_kelo_silver"]
              },
              "groups": {}
            }
          ]
        }
      }
    }
  }
}
```

En fullständig exempel-fil finns i `response.example.json`. Den visar två liggande poster, en stående post och kommentarer utanför postlistorna.

Svarsträdets nästning är en lagringsregel. Den ändrar inte villkorens kontexter: `root` hittar entydiga fält över sektioner och vanliga grupper utanför upprepade poster och objektfält. `record` hittar den aktuella posten eller objektvärdet. Klienten behöver härleda dessa kontexter från protokollet och svarsträdet; den får inte söka efter första förekomsten av ett ID i hela JSON-dokumentet.

### Svarsvärden och obesvarade fält

Text, tal, boolean, datum, enum och multienum lagras som de JSON-värden som definieras i typavsnittet. Enumsvar använder alltid alternativets **ID**, inte `label` eller `code`. Frånvaro enligt förekomstskalan lagras exempelvis som `"occurrence_options_absent"`, även om klienten visar ”0 – Saknas”. Numeriska fält kan däremot ha det faktiska talet `0`.

Objektfält lagras direkt som objekt med underfältens ID:n, utan `fields`/`groups`-omslag. Arrayfält lagras som vanliga JSON-listor enligt `items`. De får inte automatiskt `record_id`; använd en upprepningsbar grupp när poster ska ha beständig identitet. Koordinatfält lagras som `{ "crs": "EPSG:3006", "x": 500000, "y": 6500000 }` enligt protokollets koordinatregler. Detta är ett typexempel; områdesprotokollets geografifält är fortfarande text.

Obesvarade fält får utelämnas eller lagras som `null`. För rätt fälttyp får också `""` och `[]` förekomma, med tomvärdesbetydelsen som beskrivits ovan. Dessa representationer ska bevaras vid import och export; klienten får inte ersätta dem med etiketter som ”Ej angivet”. `0`, `false` och registrerad frånvaro ska alltid bevaras som svar.

Sektioner och grupper utan uppgifter får utelämnas. En utelämnad upprepningsbar grupp och en tom lista innebär båda noll registrerade poster vid kontroll av `min_records`. `null` används inte som sektions- eller gruppobjekt. Utelämnade underträd måste ändå kontrolleras för tillämpliga obligatoriska fält och minimiantal; utelämning får inte kringgå ett krav. En tom grupp innebär inte konstaterad frånvaro av exempelvis död ved.

En komplett dataexport ska innehålla alla registrerade svar, även om en rapportpresentation döljer dem. Det krävs inte att alla obesvarade protokollfält räknas upp. Kompakt/Fullständig är en rapportinställning och ändrar aldrig svarsdokumentet. Standardvärden i protokollet får inte automatiskt ersätta obesvarade importerade värden.

### Bilder och andra bilagor

Ett besvarat `attachment`-fält innehåller exakt `{ "resource_id": "example_pixel" }`. Referensen måste finnas som nyckel i `resources`. Flera bilagefält får referera till samma resurs. Resurs-ID:t följer samma ID-mönster som protokollets definitioner men har ett separat namnutrymme i svarsdokumentet. Det behöver inte finnas i protokollet.

Varje resurs har `media_type`, `encoding: "base64"` och `data`. `filename` är valfritt och enbart ett beskrivande filnamn. Version 1 bäddar in bilagorna för att dokumentet ska kunna delas som en enda fil. Externa URL:er, absoluta sökvägar och uppladdningsinstruktioner ingår inte. Detta specificerar representationen vid datautbyte, inte klientens interna lagring eller importteknik.

`data` använder vanlig base64 med korrekt utfyllnad, utan radbrytningar och utan `data:`-prefix. Den avkodade resursen får inte vara tom. Klienten ska kontrollera att innehållet är giltigt för angiven MIME-typ och att typen matchar fältets `attachment_kind`: `image/*`, `audio/*`, `video/*`; `document` avser andra MIME-typer och `any` tillåter samtliga. Filnamnet är ingen sökväg och får inte användas som en sådan. Bilagor bör behållas oförändrade vid ren import/export utan en uttrycklig redigering.

Exemplet innehåller en mycket liten PNG-bild med en pixel för att demonstrera en komplett bilagereferens. Den är en testresurs, inte ett verkligt inventeringsfoto. Kartbilden är obesvarad. Storleksgränser, bildkonvertering och hur resurser visas bestäms av klienten och får inte ändra protokollets informationsmodell.

### Validering och kompatibilitet

En implementation ska utföra följande kontroller vid import och innan en inventering förklaras giltig:

1. Läs giltig JSON och avvisa dubbla objektnycklar. Validera dokumentets form mot `response.schema.json`, inklusive UUID:n och datumformat.
2. Slå upp exakt `protocol_id` och `protocol_version` och validera protokollet enligt dess språkversion och semantiska regler. Ersätt inte med senaste version automatiskt.
3. Gå igenom svarsträdet mot `structure`: rätt sektioner, direkta fältreferenser, grupper, objekt kontra postlistor samt globalt unika post-ID:n.
4. Kontrollera svarens faktiska datatyper, alternativ-ID:n, unika flerval och objekt-/arraystruktur enligt fältdefinitionerna. Inga automatiska konverteringar mellan strängar, tal och booleanvärden.
5. Utvärdera tillämplighet, obligatoriskhet, min/max antal poster och alla valideringsregler i rätt kontext. En tallpost får inte ha granens barkborre-alternativ och omvänt. Generella och trädslagsspecifika alternativ kombineras enligt protokollet.
6. Kontrollera tidsordning och alla bilagereferenser. Avkoda base64, verifiera MIME-typ och att resursen matchar fältets tillåtna bilagetyp. `contentEncoding` är inte i sig en sådan innehållskontroll.

Okända ID:n, felplacerade fält, otillåtna alternativ och saknade resurser får inte ignoreras eller raderas tyst. Ett utkast med ogiltiga svar kan bevaras, men ska inte beskrivas som en giltig inventering. Obesvarade frivilliga fält är däremot giltiga. Referenslösa resurser är tillåtna och ska bevaras vid en förlustfri import/export.

Vid import följd av export ska ID:n, värden, postordning, resurser och protokollreferens bevaras. Ordningen på objektnycklar, JSON-indentering och annan formatering saknar betydelse. Flervalsordningen saknar semantisk betydelse men kan bevaras. `updated_at` ändras vid redigering av innehållet, inte bara när filen öppnas eller laddas ned. Automatisk sammanfogning av två redigerade versioner ingår inte i version 1.

Appens befintliga export med `format: "faltrapport"`, `version: 1`, namn/värde-par i `fields` och data-URL:er i `images` är **ett annat format**. Den ska inte döpas om till detta format. En framtida adapter behöver använda kartläggningen ovan, översätta svar till alternativ-ID:n, bygga gruppstrukturen, tilldela post-ID:n och flytta bilagor till `resources`. Ingen sådan adapter eller ändring av appen ingår här.

## Kontroll av filerna

En Python-miljö med paketet `jsonschema[format-nongpl]` kan kontrollera struktur och datumformat från projektets rot. Tillägget behövs för datumformatens extra beroenden:

```python
import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

schema = json.loads(Path("protocol/protocol.schema.json").read_text(encoding="utf-8"))
protocol = json.loads(Path("protocol/protocol.json").read_text(encoding="utf-8"))
Draft202012Validator.check_schema(schema)
checker = FormatChecker()
if "date-time" not in checker.checkers:
    raise RuntimeError("Installera jsonschema[format-nongpl] för datumkontroll")
Draft202012Validator(schema, format_checker=checker).validate(protocol)

response_schema = json.loads(Path("protocol/response.schema.json").read_text(encoding="utf-8"))
response = json.loads(Path("protocol/response.example.json").read_text(encoding="utf-8"))
Draft202012Validator.check_schema(response_schema)
Draft202012Validator(response_schema, format_checker=checker).validate(response)
assert response["protocol_id"] == protocol["metadata"]["protocol_id"]
assert response["protocol_version"] == protocol["metadata"]["version"]
```

Detta ändrar inte appen. Koden kontrollerar filernas strukturer och protokollreferensen, men är inte en fullständig validator för inventeringssvar. De semantiska kontrollerna ovan måste också utföras. Referenserna i detta protokoll är lokala ID:n och kräver ingen hämtning av register över nätet.
