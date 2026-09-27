// Inline SVG keeps toolbar icons consistent across devices.
const paths={
 select:'M5 3l14 10-7 1-3 7z',pan:'M8 11V5a1.5 1.5 0 013 0v5-7a1.5 1.5 0 013 0v7-5a1.5 1.5 0 013 0v7-3a1.5 1.5 0 013 0v6c0 5-3 7-7 7-3 0-5-2-7-5l-3-4a2 2 0 013-2l2 2',
 pen:'M4 20l2-6L17 3l4 4L10 18z M6 14l4 4',highlighter:'M4 16l9-11 6 5-9 10z M3 21h10',eraser:'M3 14L14 3l7 7-11 11H8z M7 10l7 7 M10 21h11',
 line:'M4 20L20 4',arrow:'M4 20L20 4 M10 4h10v10',rectangle:'M3 4h18v16H3z',ellipse:'M21 12a9 8 0 11-18 0 9 8 0 0118 0',triangle:'M12 3l10 18H2z',polygon:'M12 2l10 8-4 12H6L2 10z',
 text:'M3 5V3h18v2 M12 3v18 M8 21h8',note:'M4 3h16v13l-5 5H4z M15 21v-5h5 M8 8h8 M8 12h6',equation:'M18 4c-5-4-7 1-7 6l-1 8c-1 5-5 4-5 1 M6 10h11',graph:'M3 3v18h18 M5 16l5-8 5 5 6-9',image:'M3 4h18v16H3z M3 17l6-6 5 5 3-3 4 4 M15 8h1',pdf:'M5 2h10l4 4v16H5z M15 2v5h4 M8 11h8 M8 15h8 M8 19h5',laser:'M12 8a4 4 0 100 8 4 4 0 000-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3'
};
export function toolIcon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]||paths.pen);svg.append(path);return svg;}
