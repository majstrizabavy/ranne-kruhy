# Ranné kruhy

Responzívna aplikácia pre učiteľov, bez účtov, databázy, externých knižníc a platených služieb. Obsahuje 44 testovacích aktivít z dodaného dokumentu (22 pre každý stupeň).

## Lokálne spustenie

Potrebujete Node.js. V tomto priečinku spustite:

```sh
npm start
```

Otvorte http://localhost:5173. Nie je potrebné `npm install` ani build. Súbor `index.html` neotvárajte cez `file://`, pretože aplikácia načítava JSON cez HTTP.

## Súbory

- `index.html`: základ stránky a metadata.
- `styles.css`: responzívny neónovo zelený a tmavý dizajn.
- `js/app.js`: tri obrazovky, navigácia, obľúbené a načítanie dát.
- `js/core.js`: povolené typy, validácia, filtrovanie a náhodný výber.
- `js/history.js`: lokálna história zobrazených aktivít podľa ID.
- `activities.json`: všetky aktivity.
- `manifest.webmanifest`, `sw.js`, `icons/`: inštalácia a základ offline režimu.
- `server.mjs`: lokálny vývojový server; nie je potrebný na hostingu.
- `tests/core.test.mjs`: testy dát a výberu (`npm test`).

## Pridanie aktivity

Do poľa v `activities.json` pridajte objekt s unikátnym stabilným ID. Zachovajte JSON syntax (čiarky medzi objektmi, žiadna čiarka za posledným objektom). Aplikačná logika sa nemení.

```json
{
  "id": "rk-045",
  "title": "Pozitívna vlna",
  "gradeLevel": 1,
  "tempo": "pokojné",
  "types": ["Rozhovor", "Dvojice", "Spoznávanie sa"],
  "materials": "Bez pomôcok",
  "steps": [
    "Rozdeľte sa do dvojíc.",
    "Povedzte partnerovi jednu vec, ktorú si na ňom vážite.",
    "Vymeňte si úlohy."
  ]
}
```

`gradeLevel` je číslo 1 alebo 2, `tempo` je `pokojné` alebo `živé`. Kroky sú 1–4 krátke vety, ideálne 2–3. Používajte iba: Rozhovor, Pohyb, Skupiny, Dvojice, Premýšľanie, Improvizácia, Tvorenie, Pre zábavu, Spoznávanie sa, Kvíz, Žiaci vedú aktivitu. Po úprave spustite `npm test`.

## Webhosting a PWA

Výber uprednostní ešte nevidené aktivity a potom tie najdávnejšie zobrazené. História je v `localStorage` pod kľúčom `rk-activity-history` ako verzovaný objekt s mapou `lastSeen` (ID → poradie posledného zobrazenia). Je spoločná pre filtre a pretrvá aj po zatvorení prehliadača. Obľúbené zachovávajú náhodný výber; aj ich zobrazenie sa zapíše do histórie. Pri zablokovanom úložisku sa história uchová len počas otvorenej relácie. Vymazanie údajov stránky vymaže aj históriu.

Úvodná karta sa pri otvorení jemne objaví za 0,4 sekundy. Ovládanie je okamžite dostupné, pri návrate na úvod sa animácia neopakuje a nastavenie obmedzeného pohybu ju vypína.

Nahrajte `index.html`, `styles.css`, `activities.json`, `manifest.webmanifest`, `sw.js` a priečinky `js/` a `icons/` do rovnakého adresára na ľubovoľnom statickom webhostingu. Funguje aj podadresár. Nie je potrebný Node.js na serveri. Zapnite HTTPS; localhost je výnimka pre vývoj.

Po úspešnom prvom načítaní a uložení súborov service workerom je aplikácia pripravená na základné offline používanie. Obľúbené sú iba v lokálnom úložisku daného prehliadača; nezdieľajú sa medzi zariadeniami. Vymazanie údajov stránky odstráni aj obľúbené. Ak prehliadač úložisko zablokuje, aplikácia funguje počas otvorenej relácie.

Inštaláciu ponúkne podporovaný prehliadač cez svoju ponuku inštalácie alebo pridania na plochu. Dostupnosť závisí od zariadenia a prehliadača.

Pri aktualizácii samotných aktivít stačí nahrať nový `activities.json`; názov cache meniť netreba. Pri ďalšom otvorení alebo obnovení stránky aplikácia skúsi načítať aktuálny súbor z internetu a overené dáta uloží na offline použitie. Pri nedostupnom internete, chybe servera, neplatných dátach alebo čakaní dlhšom ako 3 sekundy použije uloženú verziu. Otvorená aktivita sa počas používania nemení.

Pri aktualizácii kódu alebo dizajnu zmeňte názov cache v `sw.js`, napríklad z `ranne-kruhy-v12` na `ranne-kruhy-v13`, a nahrajte všetky zmenené súbory. Nová verzia sa aktivuje po zatvorení starých kariet aplikácie. Cache obsahuje len lokálne súbory; aplikácia nepotrebuje externé fonty ani obrázky.

Na malých displejoch alebo pri zväčšenom texte je povolené zvislé rolovanie, aby zostal obsah čitateľný a nič nebolo odrezané.
