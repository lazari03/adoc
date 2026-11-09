import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { parse, type Font } from 'opentype.js';
import fontUrl from '@fontsource/coiny/files/coiny-latin-400-normal.woff?url';
import { colors, backgrounds } from '../data/palettes';
import type { Design } from './design';

export class NameRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-4,4,3,-3,.1,100);
  private group = new THREE.Group();
  private font!: Font;
  private cache = new Map<string, THREE.ExtrudeGeometry>();
  private width = 5;
  private design?: Design;
  private observer: ResizeObserver;
  private floor: THREE.Mesh;
  private ready=false;
  onSelect?: (index: number)=>void;
  constructor(private host: HTMLElement) {
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.35;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label','Pamja 3D e emrit të personalizuar');
    this.renderer.domElement.setAttribute('role','img');
    host.appendChild(this.renderer.domElement);
    const pmrem=new THREE.PMREMGenerator(this.renderer);
    const room=new RoomEnvironment();
    this.scene.environment=pmrem.fromScene(room,.04).texture;
    room.dispose();pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xffffff,0xb3a0b2,2));
    const light=new THREE.DirectionalLight(0xfff5e7,4);light.position.set(-3,6,5);light.castShadow=true;
    light.shadow.mapSize.set(2048,2048);light.shadow.camera.left=-12;light.shadow.camera.right=12;light.shadow.camera.top=6;light.shadow.camera.bottom=-6;light.shadow.bias=-.001;light.shadow.normalBias=.025;
    this.scene.add(light);
    this.floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xeeeadd,roughness:.9}));
    this.floor.rotation.x=-Math.PI/2;this.floor.position.y=-.02;this.floor.receiveShadow=true;this.scene.add(this.floor,this.group);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);
    this.renderer.domElement.addEventListener('click',event=>{
      const rect=this.renderer.domElement.getBoundingClientRect();const pointer=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
      const ray=new THREE.Raycaster();ray.setFromCamera(pointer,this.camera);const hit=ray.intersectObjects(this.group.children)[0];if(hit)this.onSelect?.(hit.object.userData.index);
    });
    this.renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();this.ready=false;host.dispatchEvent(new CustomEvent('rendererror'));});
  }
  async load(){const response=await fetch(fontUrl);if(!response.ok)throw new Error('Font unavailable');this.font=parse(await response.arrayBuffer());this.ready=true;}
  private geometry(char:string){
    if(this.cache.has(char))return this.cache.get(char)!;
    // Invert font coordinates, retaining contours and counters as real geometry.
    const path=new THREE.ShapePath();
    for(const cmd of this.font.getPath(char,0,0,1.65).commands){
      if(cmd.type==='M')path.moveTo(cmd.x,-cmd.y);
      if(cmd.type==='L')path.lineTo(cmd.x,-cmd.y);
      if(cmd.type==='Q')path.quadraticCurveTo(cmd.x1,-cmd.y1,cmd.x,-cmd.y);
      if(cmd.type==='C')path.bezierCurveTo(cmd.x1,-cmd.y1,cmd.x2,-cmd.y2,cmd.x,-cmd.y);
      if(cmd.type==='Z')path.currentPath?.closePath();
    }
    const geometry=new THREE.ExtrudeGeometry(path.toShapes(),{depth:.19,bevelEnabled:true,bevelThickness:.15,bevelSize:.055,bevelSegments:12,curveSegments:24,steps:1});
    geometry.computeBoundingBox();const box=geometry.boundingBox!;geometry.translate(-box.min.x,-box.min.y,-.1);geometry.computeBoundingBox();
    this.cache.set(char,geometry);return geometry;
  }
  update(design:Design){
    if(!this.ready)return;
    this.design=design;
    for(const child of [...this.group.children]){this.group.remove(child);((child as THREE.Mesh).material as THREE.Material).dispose();}
    let x=0;
    Array.from(design.name).forEach((char,index)=>{
      if(char===' '){x+=.5;return;}
      const geometry=this.geometry(char);const material=new THREE.MeshPhysicalMaterial({color:colors[design.colors[index]].hex,roughness:.3,metalness:0,clearcoat:.35,clearcoatRoughness:.27});
      const mesh=new THREE.Mesh(geometry,material);mesh.position.x=x;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.index=index;this.group.add(mesh);x+=geometry.boundingBox!.max.x+.08;
    });
    this.width=Math.max(x-.08,2.5);this.group.position.x=-(x-.08)/2;
    const bg=new THREE.Color(backgrounds[design.background].hex);this.scene.background=bg;(this.floor.material as THREE.MeshStandardMaterial).color.copy(bg);
    this.renderer.domElement.setAttribute('aria-label',`Pamja 3D: ${design.name || 'Shkruaj emrin'}`);this.resize();
  }
  private frame(width:number,height:number){const aspect=width/height;const halfW=Math.max(this.width/2+.65,2.6,1.9*aspect);const halfH=halfW/aspect;this.camera.left=-halfW;this.camera.right=halfW;this.camera.top=halfH;this.camera.bottom=-halfH;this.camera.position.set(.25,2.5,9);this.camera.lookAt(0,.65,0);this.camera.updateProjectionMatrix();}
  private resize(){const width=this.host.clientWidth;const height=this.host.clientHeight;if(!width||!height)return;this.renderer.setSize(width,height);this.frame(width,height);this.renderer.render(this.scene,this.camera);}
  async export():Promise<File>{
    if(!this.ready||!this.design?.name.trim())throw new Error('Preview not ready');
    const design=this.design;const output=document.createElement('canvas');output.width=1800;output.height=1400;const context=output.getContext('2d')!;
    try {
      this.renderer.setPixelRatio(1);this.renderer.setSize(1800,1200,false);this.frame(1800,1200);this.renderer.render(this.scene,this.camera);
      context.fillStyle=backgrounds[design.background].hex;context.fillRect(0,0,1800,1400);context.drawImage(this.renderer.domElement,0,0);
      context.fillStyle='#44234d';context.font='bold 34px sans-serif';context.fillText(`Bebe&Co · ${design.name.trim()} · ${design.size} cm`,70,1270);context.font='24px sans-serif';context.fillText('Pamje orientuese · Porosit në WhatsApp: +355 68 406 9999',70,1330);
    }finally{this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.resize();}
    return new Promise((resolve,reject)=>output.toBlob(blob=>blob?resolve(new File([blob],`BebeCo-${design.name.trim().replaceAll(' ','-')}.png`,{type:'image/png'})):reject(new Error('Export failed')),'image/png'));
  }
}
