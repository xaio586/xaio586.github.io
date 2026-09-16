/* Raw WebGL arctic-fog background: 3D/4D simplex noise, domain warping and grain. */
(()=>{
  'use strict';
  const canvas=document.getElementById('webgl-background');
  if(!canvas)return;
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
  if(!gl){canvas.classList.add('is-fallback');return}

  const vertexSource=`
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main(){
      v_uv=a_position*.5+.5;
      gl_Position=vec4(a_position,0.0,1.0);
    }
  `;
  const fragmentSource=`
    precision highp float;
    varying vec2 v_uv;
    uniform float u_time;
    uniform vec2 u_mouse;
    uniform float u_grain;
    uniform vec2 u_resolution;
    uniform vec3 u_theme_a;
    uniform vec3 u_theme_b;

    vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
    float mod289(float x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
    float permute(float x){return mod289(((x*34.0)+10.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
    float taylorInvSqrt(float r){return 1.79284291400159-.85373472095314*r;}

    float snoise3(vec3 v){
      const vec2 C=vec2(1.0/6.0,1.0/3.0);
      const vec4 D=vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy));
      vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz);
      vec3 l=1.0-g;
      vec3 i1=min(g.xyz,l.zxy);
      vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx;
      vec3 x2=x0-i2+C.yyy;
      vec3 x3=x0-D.yyy;
      i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=1.0/7.0;
      vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.0*floor(p*ns.z*ns.z);
      vec4 x_=floor(j*ns.z);
      vec4 y_=floor(j-7.0*x_);
      vec4 x=x_*ns.x+ns.yyyy;
      vec4 y=y_*ns.x+ns.yyyy;
      vec4 h=1.0-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy);
      vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.0+1.0;
      vec4 s1=floor(b1)*2.0+1.0;
      vec4 sh=-step(h,vec4(0.0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
      vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x);
      vec3 p1=vec3(a0.zw,h.y);
      vec3 p2=vec3(a1.xy,h.z);
      vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
      m*=m;
      return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }

    vec4 grad4(float j,vec4 ip){
      const vec4 ones=vec4(1.0,1.0,1.0,-1.0);
      vec4 p,s;
      p.xyz=floor(fract(vec3(j)*ip.xyz)*7.0)*ip.z-1.0;
      p.w=1.5-dot(abs(p.xyz),ones.xyz);
      s=vec4(lessThan(p,vec4(0.0)));
      p.xyz=p.xyz+(s.xyz*2.0-1.0)*s.www;
      return p;
    }

    float snoise4(vec4 v){
      const vec4 C=vec4(.138196601125011,.276393202250021,.414589803375032,-.447213595499958);
      vec4 i=floor(v+dot(v,vec4(.309016994374947451)));
      vec4 x0=v-i+dot(i,C.xxxx);
      vec4 i0;
      vec3 isX=step(x0.yzw,x0.xxx);
      vec3 isYZ=step(x0.zww,x0.yyz);
      i0.x=isX.x+isX.y+isX.z;
      i0.yzw=1.0-isX;
      i0.y+=isYZ.x+isYZ.y;
      i0.zw+=1.0-isYZ.xy;
      i0.z+=isYZ.z;
      i0.w+=1.0-isYZ.z;
      vec4 i3=clamp(i0,0.0,1.0);
      vec4 i2=clamp(i0-1.0,0.0,1.0);
      vec4 i1=clamp(i0-2.0,0.0,1.0);
      vec4 x1=x0-i1+C.xxxx;
      vec4 x2=x0-i2+C.yyyy;
      vec4 x3=x0-i3+C.zzzz;
      vec4 x4=x0+C.wwww;
      i=mod289(i);
      float j0=permute(permute(permute(permute(i.w)+i.z)+i.y)+i.x);
      vec4 j1=permute(permute(permute(permute(i.w+vec4(i1.w,i2.w,i3.w,1.0))+i.z+vec4(i1.z,i2.z,i3.z,1.0))+i.y+vec4(i1.y,i2.y,i3.y,1.0))+i.x+vec4(i1.x,i2.x,i3.x,1.0));
      vec4 ip=vec4(1.0/294.0,1.0/49.0,1.0/7.0,0.0);
      vec4 p0=grad4(j0,ip);
      vec4 p1=grad4(j1.x,ip);
      vec4 p2=grad4(j1.y,ip);
      vec4 p3=grad4(j1.z,ip);
      vec4 p4=grad4(j1.w,ip);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
      p4*=taylorInvSqrt(dot(p4,p4));
      vec3 m0=max(.6-vec3(dot(x0,x0),dot(x1,x1),dot(x2,x2)),0.0);
      vec2 m1=max(.6-vec2(dot(x3,x3),dot(x4,x4)),0.0);
      m0*=m0;m1*=m1;
      return 49.0*(dot(m0*m0,vec3(dot(p0,x0),dot(p1,x1),dot(p2,x2)))+dot(m1*m1,vec2(dot(p3,x3),dot(p4,x4))));
    }

    float hash21(vec2 p){
      p=fract(p*vec2(123.34,456.21));
      p+=dot(p,p+45.32);
      return fract(p.x*p.y);
    }

    void main(){
      vec2 uv=v_uv;
      vec2 p=uv*2.0-1.0;
      float aspect=u_resolution.x/max(u_resolution.y,1.0);
      p.x*=aspect;

      vec2 mouse=u_mouse*2.0-1.0;
      mouse.x*=aspect;
      vec2 delta=p-mouse;
      float mouseFalloff=1.0-smoothstep(0.0,.32,length(delta));
      p+=normalize(delta+vec2(.0001))*mouseFalloff*.055;

      float t=u_time;
      float low=snoise3(vec3(p*.62,t*.05));
      vec2 warp1=vec2(
        snoise3(vec3(p*.82+vec2(1.7,-.4),t*.07)),
        snoise3(vec3(p*.82+vec2(-2.1,1.3),t*.065))
      );
      vec2 q=p+warp1*.24+low*.08;
      vec2 warp2=vec2(
        snoise3(vec3(q*1.35+vec2(-.8,2.4),t*.09)),
        snoise3(vec3(q*1.35+vec2(2.7,-1.8),t*.085))
      );
      q+=warp2*.13;
      float warp3=snoise3(vec3(q*2.15+warp1*.18,t*.12));
      q+=vec2(warp3,-warp3)*.055;
      float field=snoise4(vec4(q*1.08,t*.10,.37));
      field+=.34*snoise4(vec4(q*1.92+warp2*.12,t*.13,1.71));
      field=clamp(field*.36+.53,0.0,1.0);

      vec3 color=mix(u_theme_a,u_theme_b,smoothstep(.16,.72,field));
      color=mix(color,vec3(1.0),.10+.38*smoothstep(.61,.94,field));
      float grain=hash21(gl_FragCoord.xy+vec2(t*41.0,-t*29.0));
      color=clamp(color+(grain-.5)*u_grain,0.0,1.0);
      gl_FragColor=vec4(color,1.0);
    }
  `;

  const compile=(type,source)=>{
    const shader=gl.createShader(type);
    gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)||'Shader compile failed');
    return shader;
  };
  let program;
  try{
    program=gl.createProgram();
    gl.attachShader(program,compile(gl.VERTEX_SHADER,vertexSource));
    gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragmentSource));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'WebGL link failed');
  }catch(error){
    console.warn('Arctic WebGL background unavailable:',error);
    canvas.classList.add('is-fallback');return;
  }
  gl.useProgram(program);
  const buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'a_position');
  gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const uniforms={
    time:gl.getUniformLocation(program,'u_time'),
    mouse:gl.getUniformLocation(program,'u_mouse'),
    grain:gl.getUniformLocation(program,'u_grain'),
    resolution:gl.getUniformLocation(program,'u_resolution'),
    themeA:gl.getUniformLocation(program,'u_theme_a'),
    themeB:gl.getUniformLocation(program,'u_theme_b')
  };
  const mouse={x:.5,y:.5};
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=value=>Math.max(0,Math.min(1,value));
  const parseColor=value=>{
    const hex=String(value||'').trim().replace('#','');
    const full=hex.length===3?hex.split('').map(x=>x+x).join(''):hex;
    if(!/^[0-9a-f]{6}$/i.test(full))return null;
    return [0,2,4].map(at=>parseInt(full.slice(at,at+2),16)/255);
  };
  const saturate=color=>{
    const high=Math.max(...color),low=Math.min(...color),middle=(high+low)*.5;
    const factor=high-low<.18?1.85:1.48;
    return color.map(channel=>clamp(middle+(channel-middle)*factor));
  };
  const theme={
    currentA:[.16,.68,.94],currentB:[.10,.82,.67],
    targetA:[.16,.68,.94],targetB:[.10,.82,.67]
  };
  window.setIeltsBackgroundTheme=(first,second)=>{
    const a=parseColor(first),b=parseColor(second);
    if(!a||!b)return;
    theme.targetA=saturate(a);theme.targetB=saturate(b);
    canvas.dataset.theme=`${first}|${second}`;
    if(reduce.matches){theme.currentA=[...theme.targetA];theme.currentB=[...theme.targetB]}
  };
  let frame=0,start=performance.now(),lastTime=start;
  const resize=()=>{
    const ratio=Math.min(devicePixelRatio||1,1.5);
    const width=Math.max(1,Math.round(innerWidth*ratio));
    const height=Math.max(1,Math.round(innerHeight*ratio));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height)}
  };
  const draw=now=>{
    resize();
    const dt=Math.min(Math.max((now-lastTime)*.001,0),.1);lastTime=now;
    const blend=reduce.matches?1:1-Math.exp(-dt*1.9);
    theme.currentA=theme.currentA.map((value,i)=>value+(theme.targetA[i]-value)*blend);
    theme.currentB=theme.currentB.map((value,i)=>value+(theme.targetB[i]-value)*blend);
    gl.uniform1f(uniforms.time,(now-start)*.001);
    gl.uniform2f(uniforms.mouse,mouse.x,mouse.y);
    gl.uniform1f(uniforms.grain,.042);
    gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
    gl.uniform3fv(uniforms.themeA,theme.currentA);
    gl.uniform3fv(uniforms.themeB,theme.currentB);
    gl.drawArrays(gl.TRIANGLES,0,3);
  };
  const loop=now=>{draw(now);frame=requestAnimationFrame(loop)};
  const syncMotion=()=>{
    cancelAnimationFrame(frame);
    if(reduce.matches)draw(start);
    else frame=requestAnimationFrame(loop);
  };
  addEventListener('resize',()=>{resize();if(reduce.matches)draw(start)},{passive:true});
  addEventListener('pointermove',event=>{
    mouse.x=event.clientX/Math.max(innerWidth,1);
    mouse.y=1.0-event.clientY/Math.max(innerHeight,1);
    if(reduce.matches)draw(start);
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)cancelAnimationFrame(frame);
    else syncMotion();
  });
  reduce.addEventListener?.('change',syncMotion);
  resize();syncMotion();
})();
