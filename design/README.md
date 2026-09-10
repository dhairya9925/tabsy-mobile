# Expense Manager — mobile design exploration

Ten visual directions with three mobile screens each (30 total). Directions 06–10 use a 393 × 852 pt iPhone canvas. The two supplied HTML references are included as full-size gallery concepts, followed by two new directions that extend their strongest ideas.

Open **index.html** directly in a browser. Fonts and icons are bundled locally; no server, install, or internet connection is needed. On a narrow display, swipe horizontally within a concept to compare its screens.

## Directions

| Direction | Character | Screens |
| --- | --- | --- |
| 01 Emerald | Charcoal and emerald; closest to the current product | Spending overview, personal expense entry, group activity |
| 02 Paper | Warm ivory and forest green; a calm personal ledger | Monthly ledger, personal expense entry, shared ledger |
| 03 Together | Soft lavender and peach; social and approachable | People and groups overview, equal group split, group activity |
| 04 Signal | Midnight blue and lime; compact and analytical | Spending trends, personal expense entry, group balances |
| 05 Orbit | Cobalt, citrus, and peach; bold modular workspace | Plan overview, quick expense capture, shared space |
| 06 Metro | Transit-map wayfinding with stable category line colors | Monthly route, new stop, weekend route |
| 07 Cashcoded | Black and signal orange; supplied cash-first reference | Receivable overview, split entry, group detail |
| 08 Duo Streak | Cream, green, and orange; supplied motivational reference | Streak overview, guided entry, group detail |
| 09 Sprout | Mist, leaf, sun, and clay; calm consistency | Monthly rhythm, journal entry, shared rhythm |
| 10 Stack | Navy with lemon, sky, and rose account layers | Layer overview, stack entry, group layer |

Cashcoded and Duo Streak preserve the character of the supplied references. Sprout makes consistency useful without turning finance into a game, while Stack gives personal, friend, and group spending a persistent visual structure.

## Files

- `index.html`, `styles.css`, `designs.js`: editable local gallery and reusable screen-building functions.
- `splittrack_concept_tab_cashcoded.html`, `splittrack_concept_streak_duocoded.html`: supplied source references, preserved unchanged.
- `concept-briefs-07-10.md`: rationale and token notes for the supplied and new directions.
- `exports/*-board.png`: one comparison board per direction, three screens per board. The latest boards are `cashcoded-board.png`, `duostreak-board.png`, `sprout-board.png`, and `stack-board.png`.
- `exports/<direction>-1.png`: overview.
- `exports/<direction>-2.png`: add expense.
- `exports/<direction>-3.png`: group activity or balances.
- `exports/all-concepts.png`: complete gallery.
- `tokens.json`: palettes, typography, and sizing reference.
- `assets/`: bundled fonts, font licenses, and Lucide SVG icons from the existing frontend dependency.

PNGs are rendered at 2× resolution. Directions 01–05 export at 780 × 1688 px per screen; directions 06–10 export at 786 × 1704 px. Export boards can also be opened using `index.html?export=<direction>`.

## Scope and interactions

These are visual design explorations, using fictional sample transactions and balances. No backend or account connection is made. Category chips and expense-type tabs change their selected appearance, the numeric keypad changes the displayed amount, and Save shows sample confirmation. Tabs demonstrate selection styling; they do not implement distinct production forms. Other preview buttons show contextual feedback.

The same sample month uses ₹18,640 spending, ₹2,450 receivable, and ₹850 payable. The Weekend crew example contains a ₹2,400 dinner split four ways: ₹600 per person, leaving ₹1,800 owed to the payer. Earlier cab and coffee shares are marked settled.

These are design references, not a shipped mobile app. Native scrolling, keyboards, full navigation, data validation, accessibility scaling, and empty/loading/error states belong to the implementation stage.

## Source alignment

Reviewed the existing dashboard, expense form, group form, group listing, and theme configuration. Concepts preserve personal / 1-on-1 / group expense scopes, categories, dates, notes, equal/custom splitting, shared activity, and settlements. No bank integration or budget feature is implied.

The original product fonts are **Space Grotesk** for interface text and **JetBrains Mono** for numeric emphasis, as declared in `frontend/tailwind.config.ts`. Later directions deliberately replace them: Orbit uses **Plus Jakarta Sans**, Metro uses **Archivo**, Cashcoded adds **Archivo Black**, Duo Streak uses **Fredoka**, Sprout uses **Manrope**, and Stack uses **Space Mono**. Open-source font files and licenses are bundled for offline viewing.

## Validation

Checked all 30 screens in headless Chrome: all fonts used by the remaining concepts loaded, no content overflow in the fixed screen areas, no browser JavaScript errors, and no page-width overflow at a 393 px viewport. Visually reviewed all ten comparison boards. Category selection, segmented controls, numeric keypads, and sample Save confirmation were exercised. The latest concepts use 44 pt minimum targets for their primary controls and respect the iPhone home-indicator zone.

## Figma status

The requested `figma-generate-design`, `figma-use`, and `figma-create-new-file` skills were loaded. No Code Connect mappings were found in the repository. The connected Figma account lists four teams, and the file-creation skill requires a team choice before creating a file. A team selection or editable target file URL is pending; no Figma file or imported library components are claimed by these local artifacts.

Once a destination is selected, the next Figma steps are to inspect the target file and its libraries, discover components/tokens/styles, and compose editable screens using the skill’s component workflow. The local PNGs and gallery already provide the complete visual direction for those screens.
