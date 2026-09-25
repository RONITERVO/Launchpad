// Identity is separate from discovery so daily syncs cannot erase the art.
export const categories = [
  {id:'all', label:'All'},
  {id:'play', label:'Play', color:'#f6aab1'},
  {id:'learn', label:'Learn', color:'#8edccc'},
  {id:'create', label:'Create', color:'#c6b3ff'},
  {id:'lab', label:'Lab', color:'#91c9fb'},
];
export const profiles = {
  'ronitervo/ink-battle': {label:'Ink Battle', category:'play', image:'ink-battle', order:1, summary:'A pencil-and-watercolor battle on a 3D sketchbook, with physical troops, castles and cannons. Play by mouse, touch or in mixed reality.'},
  'ronitervo/statebeats': {label:'StateBeats', category:'play', image:'statebeats', order:2, summary:'A spatial rhythm game with musical orbits, moving targets, original tracks and desktop or WebXR play.'},
  'ronitervo/cubehelperxr': {label:'Cube XR', category:'play', image:'cube-helper', order:3, summary:'A mixed-reality Rubik’s cube with hand gestures and step-by-step solving hints, plus a phone version.'},
  'ronitervo/maestrotutor': {label:'Maestro', category:'learn', image:'maestro', order:4, summary:'A bilingual AI language tutor with a globe, notebook conversations, voice, images and live multimodal calls.'},
  'ronitervo/spanish-quick-apps': {label:'Spanish', category:'learn', image:'spanish', order:5, summary:'25 touch experiences exploring colors, music, science and the cosmos in Spanish, with synchronized narration and translations.'},
  'ronitervo/idea-to-svg': {label:'Sketch AI', category:'create', image:'sketch-ai', order:6, summary:'Turn an idea into SVG graphics through repeated generation, visual critique and refinement.'},
  'ronitervo/automatic-chessboard': {label:'Chess', category:'lab', image:'automatic-chessboard', order:7, summary:'An immersive simulation of an Arduino-controlled automatic chessboard, including its pieces, electronics, mechanisms and replay.'},
  'ronitervo/magnet-simulation': {label:'Magnets', category:'lab', image:'magnets', order:8, summary:'A magnet engineering workbench for finite-size fields, force, tolerances, measured curves and supplier sample checks.'},
};
export function inferCategory(site) {
  const content=`${site.repository||''} ${site.description||''} ${site.readme?.summary||''}`.toLowerCase();
  const scores=[
    ['play',/\b(game|gaming|rhythm|puzzle|playable|chess|battle)\b/g],
    ['learn',/\b(tutor|language|spanish|learning|educational|lesson|learn)\b/g],
    ['create',/\b(svg|drawing|creative|editor|design|art|graphics|sketch)\b/g],
    ['lab',/\b(engineering|simulation|simulator|physics|magnet|arduino|hardware|sensor)\b/g],
  ].map(([id,re])=>[id,(content.match(re)||[]).length]);
  scores.sort((a,b)=>b[1]-a[1]);return scores[0][1]?scores[0][0]:'lab';
}
export function present(site) {
  const profile=profiles[site.repository?.toLowerCase()];
  const category=profile?.category||(categories.some(c=>c.id===site.category&&c.id!=='all')?site.category:inferCategory(site));
  return {...site,category,label:profile?.label||site.name,summary:profile?.summary||site.readme?.summary||site.description||'',image:profile?.image?`./art/${profile.image}.webp`:null,order:profile?.order||100};
}
export function visibleApps(sites,category,query) {
  const terms=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return sites.map(present).filter(site=>(category==='all'||site.category===category)&&terms.every(term=>`${site.label} ${site.name} ${site.repository} ${site.summary} ${site.category}`.toLocaleLowerCase().includes(term)))
    .sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name));
}
// Every app remains reachable on short screens via discrete home-screen pages.
export function gridLayout(width,height,fontSize=16) {
  const gap=width<500?14:24;
  const columns=width<260?3:4;
  const cell=Math.max(44,Math.min(124,Math.floor((width-gap*(columns-1))/columns)));
  const labelHeight=fontSize*3;
  const icon=Math.max(36,Math.min(cell,Math.floor(height-labelHeight)));
  const rowHeight=icon+labelHeight;
  const rows=Math.max(1,Math.floor((height+gap)/(rowHeight+gap)));
  return {columns,cell,icon,rowHeight,gap,capacity:columns*rows};
}
