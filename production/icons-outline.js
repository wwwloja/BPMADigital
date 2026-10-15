/* BPMA Digital: ícones de traços simples, vetoriais e locais. */
(() => {
 const art={
  bo:'<path d="M14 3H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h6M14 3v5h5M14 3l5 5v4M8 12h5M8 16h3"/><path d="M18 13l4 1.5v3c0 3-2 4.5-4 5.5-2-1-4-2.5-4-5.5v-3Z"/>',
  rfa:'<path d="M4 16C1 7 8 3 18 3c1 5 0 8-3 11M3 21L14 9"/><circle cx="16.5" cy="16.5" r="4.5"/><path d="m20 20 3 3"/>',
  cpu:'<path d="M4 12l2-6h12l2 6v8H4Z M4 12h16 M6 7l-1 5m13-5 1 5M4 20v2h3v-2m10 0v2h3v-2M2 10h2m16 0h2M8 3h8v3H8Z M7 16h2m6 0h2m-7 2h4"/>',
  folder:'<path d="M3 8V6a2 2 0 0 1 2-2h4l3 3h8a2 2 0 0 1 2 2v11H3L1 10h21M10 7V2h7l3 3v2M17 2v3h3"/>',
  user:'<circle cx="8" cy="7" r="3"/><path d="M1 21v-3a7 7 0 0 1 14 0v3M16 4a3 3 0 0 1 0 6m1 3a6 6 0 0 1 6 6v2"/>',
  chart:'<path d="M3 3v18h19M7 17v-5h3v5M13 17V8h3v9M19 17V3h3v14"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  home:'<path d="M2 11 12 3l10 8M5 10v11h14V10M9 21v-7h6v7"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  term:'<rect x="4" y="3" width="16" height="19" rx="2"/><path d="M8 3V1h8v2M8 8h8M8 12h8m-8 4h3m3 2 2 2 4-5"/>',
  shotgun:'<path d="M2 6h19v6h-9l-2 3 2 7H6l-3-10H2Z M3 9h16M16 6V4h3v2M12 12v3H9m0-3v2"/>',
  cuffs:'<ellipse cx="6.5" cy="16" rx="5" ry="6"/><ellipse cx="17.5" cy="16" rx="5" ry="6"/><ellipse cx="6.5" cy="16" rx="2.5" ry="3.5"/><ellipse cx="17.5" cy="16" rx="2.5" ry="3.5"/><path d="M4 10V7h5v3m6 0V7h5v3M8 7l2-4 3 2 2-2 2 4"/>',
  bird:'<path d="M5 15c-1-6 4-9 9-6 0-5 3-7 6-5 2 1 2 4 0 5l3 2-4 1c-1 5-5 8-11 7l-6 3Z M7 15c3 0 5-2 8-5M12 19v4m4-5v5m-6 0h9"/><circle cx="18" cy="6" r=".5"/>',
  paw:'<path d="M7 15c1-3 3-5 5-5s4 2 5 5l3 4c1 3-1 4-4 3-3-2-5-2-8 0-3 1-5 0-4-3Z"/><ellipse cx="4" cy="10" rx="2" ry="3" transform="rotate(-25 4 10)"/><ellipse cx="9" cy="5" rx="2" ry="3"/><ellipse cx="15" cy="5" rx="2" ry="3"/><ellipse cx="20" cy="10" rx="2" ry="3" transform="rotate(25 20 10)"/>',
  coins:'<ellipse cx="9" cy="6" rx="6" ry="2.5"/><path d="M3 6v4c0 3 12 3 12 0V6M3 10v4c0 2 4 3 8 2M3 14v4c0 2 4 3 8 2"/><circle cx="17" cy="16" r="6"/><path d="M19 13h-3c-3 0-3 3 0 3h2c3 0 3 3 0 3h-3m2-8v10"/>',
  material:'<path d="M3 7l9-5 9 5v13l-9 3-9-3Z M3 7l9 5 9-5M12 12v11M7 4l9 5v5"/>',
  balance:'<path d="M12 3v18M7 21h10M4 7h16M5 7l-4 9h8L5 7Zm14 0-4 9h8l-4-9ZM1 16c1 3 7 3 8 0m6 0c1 3 7 3 8 0"/>',
  key:'<circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-3-3 2-2m-5-1 2-2"/>'
 };
 art.file=art.bo;art.leaf=art.rfa;art.people=art.user;art.car=art.cpu;
 function render(name){return `<svg class="bpma-outline" viewBox="0 0 26 26" width="38" height="38" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><g transform="translate(1 1)">${art[name]||art.grid}</g></svg>`;}
 window.BPMA_ICONS={render};
})();
