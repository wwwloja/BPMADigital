/* Ícones vetoriais locais: BPMA verde e dourado. Nenhuma dependência externa. */
(() => {
 const green='#10553f',gold='#c59d40',white='#ffffff';
 const path=(d,color=green)=>`<path d="${d}" data-fill="${color===gold?'gold':color===white?'white':'green'}" fill="${color}" stroke="none"/>`;
 const circle=(x,y,r,color=green)=>`<circle cx="${x}" cy="${y}" r="${r}" data-fill="${color===gold?'gold':color===white?'white':'green'}" fill="${color}" stroke="none"/>`;
 const line=d=>`<path d="${d}" data-line="gold" fill="none" stroke="${gold}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
 const art={
  bo:path('M11 4h18l9 9v27a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z')+path('M29 4v10h9',gold)+path('M14 19h16v3H14zm0 7h12v3H14zm0 7h7v3h-7',white)+path('M35 25l9 3v7c0 6-5 9-9 11-4-2-9-5-9-11v-7Z',gold),
  rfa:path('M6 31C2 13 13 5 35 4c3 19-4 31-22 31Z')+path('M13 32l14-17 2 2-14 17Z',white)+line('M7 41l10-12')+circle(34,31,10,gold)+circle(34,31,6.5,white)+path('M39 38l8 8-3 3-8-8Z',gold),
  cpu:path('M9 15a4 4 0 0 1 4-3h22a4 4 0 0 1 4 3l5 14v13a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-3H13v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V29Z')+path('M14 16h20l4 11H10Z',white)+path('M10 31h9v4h-9zm19 0h9v4h-9',gold)+path('M18 35h12v3H18',white)+path('M15 5h8v5h-8zm10 0h8v5h-8',gold)+path('M0 22h6v5H0zm42 0h6v5h-6'),
  folder:path('M5 11h13l5 5h19v24H5a3 3 0 0 1-3-3V14a3 3 0 0 1 3-3Z')+path('M20 4h17l6 6v23H20Z',white)+path('M25 13h12v3H25zm0 7h12v3H25',gold)+path('M8 25h37l-6 18H3Z'),
  user:circle(16,14,8)+circle(34,14,8,gold)+path('M34 25c9 0 13 6 13 15v4H24V30c2-3 5-5 10-5Z',gold)+path('M16 25C7 25 2 31 2 40v4h28v-4c0-9-5-15-14-15Z'),
  chart:path('M5 29h8v14H5zm11-9h8v23h-8zm11-9h8v32h-8')+path('M38 4h8v39h-8',gold),
  grid:path('M4 4h17v17H4zm23 23h17v17H27Z')+path('M27 4h17v17H27zm-23 23h17v17H4Z',gold),
  home:path('M3 22L24 4l21 18-4 5-17-15L7 27Z',gold)+path('M9 25l15-13 15 13v19H9Z')+path('M20 30h8v14h-8',white),
  arrow:line('M9 24h30M29 14l10 10-10 10'),
  term:path('M8 4h32v40H8Z')+path('M14 12h20v3H14zm0 9h20v3H14zm0 9h13v3H14',white)+circle(35,36,10,gold)+path('M31 36l3 3 6-7-2-2-4 5-2-2Z',white),
  shotgun:path('M3 13h39v12H24l-2 7 4 12H14L9 25H3Z')+path('M35 9h7v4h-7zm-17 17h9v3h-9zm-4 10h8v3h-8',gold)+path('M7 17h31v3H7',white),
  cuffs:line('M13 15l5-7 6 4 5-4 6 7')+path('M6 17h15v7H6Z')+path('M27 17h15v7H27Z',gold)+path('M13 20a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm0 5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z')+path('M35 20a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm0 5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z',gold),
  bird:path('M8 28c-1-12 9-16 18-12 0-7 4-12 10-10 5 1 6 7 3 10l7 4-9 2c-2 10-11 15-23 14L2 42Z')+path('M13 28c6 0 12-3 18-10-1 12-8 17-17 17Z',gold)+circle(35,11,1.8,white)+line('M23 35v8m8-11v11M19 44h8m0 0h8'),
  paw:path('M14 29c3-7 5-10 10-10s8 3 11 10l6 9c2 6-3 10-9 6-6-3-10-3-16 0-6 4-11 0-9-6Z',gold)+path('M7 16c-5 1-5 11 0 12 5 0 6-10 0-12Zm10-14c-6 0-6 14 0 14 6 0 6-14 0-14Zm14 0c-6 0-6 14 0 14 6 0 6-14 0-14Zm10 14c-6 2-5 12 0 12 5-1 5-11 0-12Z'),
  coins:path('M5 16h25v23c0 8-25 8-25 0Z')+path('M5 16c0-8 25-8 25 0 0 8-25 8-25 0Z',gold)+line('M6 26c5 4 18 4 23 0m-23 8c5 4 18 4 23 0')+circle(34,33,12,gold)+path('M33 24h3v3h4v3h-7v2h5c6 1 3 9-2 9v3h-3v-3h-5v-3h8v-3h-5c-5 0-5-8 2-8Z',green),
  material:path('M5 15l19-11 19 11v25L24 47 5 40Z')+path('M24 25l19-10v25l-19 7Z',gold)+path('M5 15l19 10 19-10-19-11Z',white)+path('M12 11l19 10v9l5-3v-9L18 8Z',gold),
  balance:line('M24 5v35M8 14h32M7 14l-5 16h12L7 14Zm34 0-7 16h12l-5-16Z')+path('M2 30h12c0 8-12 8-12 0Zm32 0h12c0 8-12 8-12 0ZM13 40h22v5H13Z')
 };
 art.file=art.bo;art.leaf=art.rfa;art.people=art.user;art.car=art.cpu;
 function render(name){return `<svg class="bpma-duotone" viewBox="0 0 52 52" width="38" height="38" aria-hidden="true" focusable="false">${art[name]||art.grid}</svg>`;}
 window.BPMA_ICONS={render};
})();
