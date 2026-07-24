# Project Structure

```text
dor-dam-main
├── backend
│   ├── .env.example
│   ├── .gitignore
│   ├── eslint.config.mjs
│   ├── gng_cat.html
│   ├── gng_prod.html
│   ├── kry_category.html
│   ├── output
│   │   ├── apple-gadgets-2026-06-21T09-44-25-196Z.json
│   │   ├── custom-mac-bd-2026-06-28T19-13-20-124Z.json
│   │   ├── diamu-2026-06-28T20-08-51-687Z.json
│   │   ├── gadget-&-gear-2026-06-21T09-47-40-880Z.json
│   │   ├── gadget-&-gear-2026-06-21T10-04-16-399Z.json
│   │   ├── gadget-bangladesh-2026-06-28T19-34-16-801Z.json
│   │   ├── gadget-bangladesh-2026-06-28T19-34-43-189Z.json
│   │   ├── gadget-bangladesh-2026-06-28T19-37-00-785Z.json
│   │   ├── gadget-bangladesh-errors-2026-06-28T19-34-16-801Z.json
│   │   ├── gadget-bangladesh-errors-2026-06-28T19-34-43-189Z.json
│   │   ├── gadget-bangladesh-errors-2026-06-28T19-37-00-785Z.json
│   │   ├── gadget-bd-2026-06-28T20-59-35-299Z.json
│   │   ├── gadget-bd-2026-06-28T21-02-23-055Z.json
│   │   ├── gadget-monkey-bd-2026-06-28T20-17-35-592Z.json
│   │   ├── gadget-studio-bd-2026-06-28T20-22-09-082Z.json
│   │   ├── gadget-studio-bd-2026-06-28T20-44-52-741Z.json
│   │   ├── gsmarena-catalog-2026-07-01T19-08-40-280Z.json
│   │   ├── gsmarena-catalog-2026-07-01T19-09-40-014Z.json
│   │   ├── gsmarena-catalog-2026-07-01T19-35-35-274Z.json
│   │   ├── gsmarena-catalog-latest.json
│   │   ├── kry-international-2026-06-28T20-34-46-506Z.json
│   │   ├── kry-international-2026-06-28T20-46-47-061Z.json
│   │   ├── rio-international-2026-06-28T19-26-50-149Z.json
│   │   ├── star-tech-2026-06-19T11-53-57-549Z.json
│   │   └── star-tech-errors-2026-06-19T11-53-57-549Z.json
│   ├── package-lock.json
│   ├── package.json
│   ├── prisma
│   │   └── schema.prisma
│   ├── prisma.config.ts
│   ├── scratch.js
│   ├── scratch2.js
│   ├── scratch3.js
│   ├── scratch4.js
│   ├── scratch5.js
│   ├── scratch_gadgetbd_discover.js
│   ├── scratch_gadgetbd_discover2.js
│   ├── scratch_gadgetbd_discover3.js
│   ├── scratch_gadgetbd_discover4.js
│   ├── scratch_gadgetbd_discover5.js
│   ├── scratch_gadgetbd_discover6.js
│   ├── scratch_gadgetmonkey.js
│   ├── scratch_gadgetmonkey_cat.js
│   ├── scratch_gadgetmonkey_cat2.js
│   ├── scratch_gadgetmonkey_cat3.js
│   ├── scratch_gadgetmonkey_cat4.js
│   ├── scratch_gadgetmonkey_cat5.js
│   ├── scratch_gadgetmonkey_prod.js
│   ├── scratch_gadgetmonkey_prod2.js
│   ├── scratch_gadgetmonkey_prod3.js
│   ├── scratch_kry.js
│   ├── scratch_kry2.js
│   ├── scratch_kry3.js
│   ├── scratch_kry4.js
│   ├── scratch_kry6.js
│   ├── scratch_kry7.js
│   ├── scratch_kry8.js
│   ├── scratch_kry_playwright.js
│   ├── scratch_kry_playwright2.js
│   ├── scratch_kry_playwright3.js
│   ├── scratch_kry_playwright4.js
│   ├── scratch_kry_price.js
│   ├── scratch_kry_price2.js
│   ├── scratch_kry_test.js
│   ├── src
│   │   ├── app.js
│   │   ├── cli.js
│   │   ├── config
│   │   │   └── env.js
│   │   ├── controllers
│   │   │   ├── catalogController.js
│   │   │   └── scraperController.js
│   │   ├── db
│   │   │   └── prisma.js
│   │   ├── gsmarena-cli.js
│   │   ├── middleware
│   │   │   ├── asyncHandler.js
│   │   │   ├── errorHandler.js
│   │   │   ├── notFound.js
│   │   │   └── requestLogger.js
│   │   ├── routes
│   │   │   ├── catalogRoutes.js
│   │   │   ├── index.js
│   │   │   └── scraperRoutes.js
│   │   ├── scraper
│   │   │   ├── core
│   │   │   │   ├── AbstractScraper.js
│   │   │   │   ├── ApiScraper.js
│   │   │   │   ├── BaseScraper.js
│   │   │   │   ├── Browser.js
│   │   │   │   └── CheerioScraper.js
│   │   │   ├── gsmarena
│   │   │   │   ├── GsmArenaScraper.js
│   │   │   │   └── parse.js
│   │   │   ├── registry.js
│   │   │   ├── stores
│   │   │   │   ├── AppleGadgetsBdScraper.js
│   │   │   │   ├── CustomMacBdScraper.js
│   │   │   │   ├── DiamuScraper.js
│   │   │   │   ├── GadgetAndGearScraper.js
│   │   │   │   ├── GadgetBangladeshScraper.js
│   │   │   │   ├── GadgetBdScraper.js
│   │   │   │   ├── GadgetMonkeyBdScraper.js
│   │   │   │   ├── GadgetNGadgetBdScraper.js
│   │   │   │   ├── GadgetStudioBdScraper.js
│   │   │   │   ├── KryInternationalScraper.js
│   │   │   │   ├── MobileBuzzBdScraper.js
│   │   │   │   ├── RioInternationalScraper.js
│   │   │   │   └── StarTechScraper.js
│   │   │   └── transformers
│   │   │       └── productTransformer.js
│   │   ├── server.js
│   │   ├── services
│   │   │   ├── catalogService.js
│   │   │   ├── persistenceService.js
│   │   │   └── scraperService.js
│   │   ├── utils
│   │   │   ├── AppError.js
│   │   │   ├── delay.js
│   │   │   ├── httpClient.js
│   │   │   ├── logger.js
│   │   │   ├── parsers.js
│   │   │   └── retry.js
│   │   └── validators
│   │       └── scraperValidator.js
│   ├── test_diamu.js
│   ├── test_diamu_scraper.js
│   └── test_selectors.js
├── frontend
│   └── dordam
│       ├── .gitignore
│       ├── AGENTS.md
│       ├── CLAUDE.md
│       ├── README.md
│       ├── app
│       │   ├── brands
│       │   │   └── page.tsx
│       │   ├── compare
│       │   │   ├── CompareClient.tsx
│       │   │   └── page.tsx
│       │   ├── favicon.ico
│       │   ├── finder
│       │   │   ├── FinderClient.tsx
│       │   │   └── page.tsx
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   ├── not-found.tsx
│       │   ├── page.tsx
│       │   └── phones
│       │       ├── PhoneListFilters.tsx
│       │       ├── [slug]
│       │       │   └── page.tsx
│       │       └── page.tsx
│       ├── components
│       │   ├── BrandGrid.tsx
│       │   ├── Footer.tsx
│       │   ├── Header.tsx
│       │   ├── Pagination.tsx
│       │   ├── PhoneCard.tsx
│       │   ├── SearchBox.tsx
│       │   └── SpecTable.tsx
│       ├── eslint.config.mjs
│       ├── lib
│       │   └── api.ts
│       ├── next-env.d.ts
│       ├── next.config.ts
│       ├── package-lock.json
│       ├── package.json
│       ├── postcss.config.mjs
│       ├── public
│       │   ├── file.svg
│       │   ├── globe.svg
│       │   ├── next.svg
│       │   ├── vercel.svg
│       │   └── window.svg
│       └── tsconfig.json
└── output
    ├── gadget-bangladesh-2026-06-28T20-04-43-544Z.json
    ├── gadget-bangladesh-2026-06-28T20-09-02-756Z.json
    ├── gadget-bangladesh-2026-06-28T20-15-47-120Z.json
    ├── gadget-bangladesh-2026-06-28T20-21-35-549Z.json
    ├── gadget-bangladesh-2026-06-28T20-33-31-746Z.json
    ├── gadget-bangladesh-2026-06-28T20-41-12-950Z.json
    ├── gadget-bangladesh-2026-06-28T20-43-40-599Z.json
    ├── solution
    └── solution.cpp
```
