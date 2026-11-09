import { colors, backgrounds } from '../data/palettes.ts';
export type Design = {name:string; size:number; colors:number[]; background:number};
export const MAX_LETTERS = 16;
export const initialDesign: Design = {name:'ELINA',size:10,colors:[6,0,2,3,6],background:0};
export function cleanName(value: string) { return Array.from(value.normalize('NFC').toLocaleUpperCase('sq').replace(/[^A-ZÇË -]/g,'')).slice(0,MAX_LETTERS).join(''); }
export function repeatPalette(name: string,palette: number[]) { let index=0; return Array.from(name).map(char=>char===' '?0:palette[index++%palette.length]); }
export function validateDesign(value: unknown): Design {
  if (!value || typeof value !== 'object') return {...initialDesign, colors:[...initialDesign.colors]};
  const candidate = value as Partial<Design>;
  if (!candidate || typeof candidate.name !== 'string' || ![8,10,12].includes(candidate.size!) || !backgrounds[candidate.background!] || !Array.isArray(candidate.colors)) return {...initialDesign, colors:[...initialDesign.colors]};
  const name=cleanName(candidate.name!);
  return {name,size:candidate.size!,background:candidate.background!,colors:Array.from(name).map((_,i)=>Number.isInteger(candidate.colors![i])&&colors[candidate.colors![i]]?candidate.colors![i]:1)};
}
export function orderUrl(design: Design) {
  const details=Array.from(design.name).map((char,i)=>char===' '?null:`${i+1}. ${char}: ${colors[design.colors[i]].name}`).filter(Boolean).join('\n');
  return `https://wa.me/355684069999?text=${encodeURIComponent(`Përshëndetje! Dua të porosis një emër të personalizuar nga Bebe&Co.\n\nEmri: ${design.name.trim()}\nMadhësia: ${design.size} cm\nNgjyrat:\n${details}\nSfondi i pamjes: ${backgrounds[design.background].name}\n\nJu lutem më konfirmoni çmimin dhe kohën e realizimit. Fotografinë e kombinimit mund ta bashkëngjis në bisedë.`)}`;
}
