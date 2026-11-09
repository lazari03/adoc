import { parse, type Font } from 'opentype.js';
import fontUrl from '@fontsource/coiny/files/coiny-latin-400-normal.woff?url';
import { colors, backgrounds } from '../data/palettes';
import type { Design } from './design';

/** Software shaded glyphs keep customization and export working without WebGL. */
export class CanvasNameRenderer {
  private canvas=document.createElement('canvas');
  private font!:Font;
  private design?:Design;
  private cache=new Map<string,HTMLCanvasElement>();
  private boxes:{x:number;width:number;index:number}[]=[];
  onSelect?:(index:number)=>void;
  constructor(private host:HTMLElement){
    host.replaceChildren(this.canvas);this.canvas.setAttribute('role','img');
    new ResizeObserver(()=>this.draw()).observe(host);
    this.canvas.addEventListener('click',e=>{const x=(e.clientX-this.canvas.getBoundingClientRect().left)/this.host.clientWidth*1200;const hit=this.boxes.find(b=>x>=b.x&&x<=b.x+b.width);if(hit)this.onSelect?.(hit.index);});
  }
  async load(){const response=await fetch(fontUrl);if(!response.ok)throw new Error('Font unavailable');this.font=parse(await response.arrayBuffer());}
  private glyph(char:string,color:string){
    const key=char+color;if(this.cache.has(key))return this.cache.get(key)!;
    const path=this.font.getPath(char,0,0,260);const box=path.getBoundingBox();const pad=24;
    const mask=document.createElement('canvas');mask.width=Math.ceil(box.x2-box.x1)+pad*2;mask.height=Math.ceil(box.y2-box.y1)+pad*2;
    const ctx=mask.getContext('2d')!;ctx.translate(pad-box.x1,pad-box.y1);path.fill='#ffffff';path.draw(ctx);ctx.resetTransform();
    const image=ctx.getImageData(0,0,mask.width,mask.height);const data=image.data;const w=mask.width,h=mask.height;
    const distance=new Float32Array(w*h);for(let i=0;i<distance.length;i++)distance[i]=data[i*4+3]>127?1000:0;
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;distance[i]=Math.min(distance[i],distance[i-1]+1,distance[i-w]+1,distance[i-w-1]+1.414,distance[i-w+1]+1.414);}
    for(let y=h-2;y>0;y--)for(let x=w-2;x>0;x--){const i=y*w+x;distance[i]=Math.min(distance[i],distance[i+1]+1,distance[i+w]+1,distance[i+w+1]+1.414,distance[i+w-1]+1.414);}
    const rgb=[1,3,5].map(start=>parseInt(color.slice(start,start+2),16));
    let heights=Float32Array.from(distance,d=>Math.sqrt(Math.max(0,1-Math.exp(-d/25)))*32);
    // Smooth the distance field before estimating normals, avoiding chamfer ridges.
    for(let pass=0;pass<3;pass++){
      const horizontal=new Float32Array(w*h),vertical=new Float32Array(w*h);const radius=3;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){let sum=0;for(let k=-radius;k<=radius;k++)sum+=heights[y*w+Math.max(0,Math.min(w-1,x+k))];horizontal[y*w+x]=sum/7;}
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){let sum=0;for(let k=-radius;k<=radius;k++)sum+=horizontal[Math.max(0,Math.min(h-1,y+k))*w+x];vertical[y*w+x]=sum/7;}
      heights=vertical;
    }
    const height=(i:number)=>heights[i];
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const i=y*w+x;if(!data[i*4+3])continue;
      const nx=(height(i-1)-height(i+1))*.5,ny=(height(i-w)-height(i+w))*.5;
      const len=Math.sqrt(nx*nx+ny*ny+1);const diffuse=Math.max(0,(nx*-.45+ny*-.6+1)/len);
      const spec=Math.pow(Math.max(0,(nx*-.28+ny*-.4+.87)/len),18)*.28;
      const shade=.65+diffuse*.35;
      for(let c=0;c<3;c++)data[i*4+c]=Math.min(255,rgb[c]*shade+255*spec);
    }
    ctx.putImageData(image,0,0);this.cache.set(key,mask);if(this.cache.size>100)this.cache.delete(this.cache.keys().next().value!);return mask;
  }
  update(design:Design){this.design=design;this.canvas.setAttribute('aria-label',`Pamja e emrit: ${design.name||'Shkruaj emrin'}`);this.draw();}
  private draw(target=this.canvas,width=1200,height?:number){
    if(!this.design||!this.font)return;const design=this.design;
    height??=Math.round(width*(this.host.clientHeight/Math.max(1,this.host.clientWidth)));
    target.width=width;target.height=height;const ctx=target.getContext('2d')!;
    ctx.fillStyle=backgrounds[design.background].hex;ctx.fillRect(0,0,width,height);
    const light=ctx.createRadialGradient(width*.3,0,0,width*.4,height*.5,width*.9);light.addColorStop(0,'#ffffff60');light.addColorStop(1,'#ffffff00');ctx.fillStyle=light;ctx.fillRect(0,0,width,height);
    const glyphs=Array.from(design.name).map((char,i)=>char===' '?null:this.glyph(char,colors[design.colors[i]].hex));
    const total=glyphs.reduce((sum,g)=>sum+(g?g.width-30:70),0);const scale=Math.min((width-120)/Math.max(total,1),(height*.48)/240,1.7);let x=(width-total*scale)/2;const baseline=height*.67;
    ctx.save();ctx.fillStyle='#9d786328';ctx.filter='blur(15px)';ctx.beginPath();ctx.ellipse(width/2,baseline+7,Math.max(total*scale*.5,1),18,0,0,Math.PI*2);ctx.fill();ctx.restore();
    this.boxes=[];
    glyphs.forEach((glyph,i)=>{if(!glyph){x+=70*scale;return;}const gw=glyph.width*scale,gh=glyph.height*scale;
      ctx.save();ctx.shadowColor='#67473038';ctx.shadowBlur=13;ctx.shadowOffsetX=3;ctx.shadowOffsetY=8;ctx.drawImage(glyph,x-15*scale,baseline-gh+24*scale,gw,gh);ctx.restore();
      this.boxes.push({x:x/width*1200,width:(gw-30*scale)/width*1200,index:i});x+=(glyph.width-30)*scale;
    });
  }
  async export():Promise<File>{if(!this.design?.name.trim())throw new Error('Empty name');const output=document.createElement('canvas');this.draw(output,1800,1200);const final=document.createElement('canvas');final.width=1800;final.height=1400;const ctx=final.getContext('2d')!;ctx.fillStyle=backgrounds[this.design.background].hex;ctx.fillRect(0,0,1800,1400);ctx.drawImage(output,0,0);ctx.fillStyle='#44234d';ctx.font='bold 34px sans-serif';ctx.fillText(`ADOC studio · ${this.design.name.trim()} · ${this.design.size} cm`,70,1270);ctx.font='24px sans-serif';ctx.fillText('Pamje orientuese · Porosit në WhatsApp: +355 68 406 9999',70,1330);this.draw();return new Promise((resolve,reject)=>final.toBlob(blob=>blob?resolve(new File([blob],`ADOC-${this.design!.name.trim().replaceAll(' ','-')}.png`,{type:'image/png'})):reject(new Error('Export failed')),'image/png'));}
}
