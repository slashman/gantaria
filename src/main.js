// Pasted SFXR
function SfxrParams(){this.setSettings=function(t){for(var r=0;24>r;r++)this[String.fromCharCode(97+r)]=t[r]||0;this.c<.01&&(this.c=.01);var e=this.b+this.c+this.e;if(.18>e){var a=.18/e;this.b*=a,this.c*=a,this.e*=a}}}function SfxrSynth(){this.a=new SfxrParams;var t,r,e,a,s,n,i,h,f,c,o,v;this.reset=function(){var t=this.a;a=100/(t.f*t.f+.001),s=100/(t.g*t.g+.001),n=1-t.h*t.h*t.h*.01,i=-t.i*t.i*t.i*1e-6,t.a||(o=.5-t.n/2,v=5e-5*-t.o),h=1+t.l*t.l*(t.l>0?-.9:10),f=0,c=1==t.m?0:(1-t.m)*(1-t.m)*2e4+32},this.totalReset=function(){this.reset();var a=this.a;return t=a.b*a.b*1e5,r=a.c*a.c*1e5,e=a.e*a.e*1e5+12,3*((t+r+e)/3|0)},this.synthWave=function(u,b){var w=this.a,y=1024,g=1!=w.s||w.v,k=w.v*w.v*.1,S=1+3e-4*w.w,l=w.s*w.s*w.s*.1,m=1+1e-4*w.t,d=1!=w.s,x=w.x*w.x,A=w.g,q=w.q||w.r,M=w.r*w.r*w.r*.2,p=w.q*w.q*(w.q<0?-1020:1020),U=w.p?((1-w.p)*(1-w.p)*2e4|0)+32:0,j=w.d,C=w.j/2,P=w.k*w.k*.01,R=w.a,W=t,z=1/t,B=1/r,D=1/e,E=5/(1+w.u*w.u*20)*(.01+l);E>.8&&(E=.8),E=1-E;var F,G,H,I,J,K,L,N=!1,O=0,Q=0,T=0,V=0,X=0,Y=0,Z=0,$=0,_=0,tt=0,rt=new Array(y),et=new Array(32);for(L=rt.length;L--;)rt[L]=0;for(L=et.length;L--;)et[L]=2*Math.random()-1;for(L=0;b>L;L++){if(N)return L;if(U&&++_>=U&&(_=0,this.reset()),c&&++f>=c&&(c=0,a*=h),n+=i,a*=n,a>s&&(a=s,A>0&&(N=!0)),G=a,C>0&&(tt+=P,G*=1+Math.sin(tt)*C),G|=0,8>G&&(G=8),R||(o+=v,0>o?o=0:o>.5&&(o=.5)),++Q>W)switch(Q=0,++O){case 1:W=r;break;case 2:W=e}switch(O){case 0:T=Q*z;break;case 1:T=1+2*(1-Q*B)*j;break;case 2:T=1-Q*D;break;case 3:T=0,N=!0}q&&(p+=M,H=0|p,0>H?H=-H:H>y-1&&(H=y-1)),g&&S&&(k*=S,1e-5>k?k=1e-5:k>.1&&(k=.1)),K=0;for(var at=8;at--;){if(Z++,Z>=G&&(Z%=G,3==R))for(var st=et.length;st--;)et[st]=2*Math.random()-1;switch(R){case 0:J=o>Z/G?.5:-.5;break;case 1:J=1-Z/G*2;break;case 2:I=Z/G,I=6.28318531*(I>.5?I-1:I),J=1.27323954*I+.405284735*I*I*(0>I?1:-1),J=.225*((0>J?-1:1)*J*J-J)+J;break;case 3:J=et[Math.abs(32*Z/G|0)]}g&&(F=Y,l*=m,0>l?l=0:l>.1&&(l=.1),d?(X+=(J-Y)*l,X*=E):(Y=J,X=0),Y+=X,V+=Y-F,V*=1-k,J=V),q&&(rt[$%y]=J,J+=rt[($-H+y)%y],$++),K+=J}K*=.125*T*x,u[L]=K>=1?32767:-1>=K?-32768:32767*K|0}return b}}var synth=new SfxrSynth;window.jsfxr=function(t){synth.a.setSettings(t);var r=synth.totalReset(),e=new Uint8Array(4*((r+1)/2|0)+44),a=2*synth.synthWave(new Uint16Array(e.buffer,44),r),s=new Uint32Array(e.buffer,0,44);s[0]=1179011410,s[1]=a+36,s[2]=1163280727,s[3]=544501094,s[4]=16,s[5]=65537,s[6]=44100,s[7]=88200,s[8]=1048578,s[9]=1635017060,s[10]=a,a+=44;for(var n=0,i="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",h="data:audio/wav;base64,";a>n;n+=3){var f=e[n]<<16|e[n+1]<<8|e[n+2];h+=i[f>>18]+i[f>>12&63]+i[f>>6&63]+i[63&f]}return h};

// Sound
let sounds = [
  // Explosion
  [3,,0.1179,0.6428,0.4267,0.7061,,-0.3837,,,,,,,,,,,1,,,,,0.5],
  [1,,0.1158,0.1299,0.2666,0.5234,0.0722,-0.4074,,,,,,0.8704,-0.5509,,,,1,,,0.2165,,0.5]
];

var BS = 5;
sounds = sounds.map(a=>jsfxr(a)).map(j=>[...Array(BS).keys()].map(()=>new Audio(j)));
let playing = {};
let curr = [0,0];
function playSound(i){
  if (playing[i]){
    return;
  }
  playing[i] = true;
  var player = sounds[i][curr[i]++];
  if (curr[i] == BS){
    curr[i] = 0;
  }
  player.play();
  setTimeout(()=>playing[i]=false, 30);
}

// Random
var rand = {
  int: function(max) {
    return Math.random() * (max || 0xfffffff) | 0;
  },
  range: function(min, max) {
    return this.int(max - min) + min;
  },
  b() {
    return this.range(0,100)<50;
  }
};

// 1993 Park-Miller LCG, https://gist.github.com/blixt/f17b47c62508be59987b
function LCG(s) {
  return function() {
    s = Math.imul(16807, s) | 0 % 2147483647;
    return (s & 2147483647) / 2147483648;
  }
}

var seeded = LCG(13312);

var rands = {
  int: function(max) {
    return seeded() * (max || 0xfffffff) | 0;
  },
  range: function(min, max) {
    if (min === max) {
      return min;
    }
    return this.int(max - min) + min;
  },
  b() {
    return this.range(0,100)<50;
  }
};


// Input
var pressed = {};
var typedCallbacks = {};
function keyPress(e){
  if (typedCallbacks[e.which]){
    typedCallbacks[e.which]();
  }
}
window.onkeydown = e => pressed[e.which] = true;
window.onkeyup = e => pressed[e.which] = false;
window.addEventListener("keypress", keyPress);
window.addEventListener("keydown", e => {if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) e.preventDefault();});
function isDown(keyCode){
  return pressed[keyCode];
};
function typed(keyCode, callback){
  typedCallbacks[keyCode] = callback;   
}

const Renderer = {
  render(c,ins,x,y,s,over,flip,scalex) {
    var sx = s
    if (scalex)
      sx = s * scalex;
    var xFlip = flip ? -1 : 1;
    c.fillStyle = over != undefined ? over : ins[0];
    var i = 1;
    drawlLine = false;
    c.globalAlpha = 1;
    while(i < ins.length + 2) {
      let co = ins[i++];
      switch (co) {
        case 'c':
          c.beginPath();
          c.arc(x,y,ins[i++]*s,0,Math.PI*2,true);
          c.fill();
          drawlLine = false;
          break;
        case 'p':
          c.strokeStyle = c.fillStyle;
          c.beginPath();
          c.moveTo(ins[i++]*sx*xFlip+x, ins[i++]*s+y);
          co = ins[i++];
          drawlLine = true;
          break;
        case 'f':
          c.fill();
          drawlLine = false;
          break;
        case 's':
          c.stroke();
          drawlLine = false;
          break;
        case 'a':
          c.globalAlpha = ins[i++];
          break;
        case 'o':
          c.fillStyle = over != undefined ? over : ins[i++];
          break;
        case 'v':
          c.save();
          c.beginPath();
          c.translate(x+ins[i++]*sx*xFlip, y+ins[i++]*s);
          c.scale(1, ins[i++]);
          c.arc(0, 0, ins[i++]*s, 0, 2 * Math.PI, false);
          c.restore(); // restore to original state
          break;
        case 'vh':
          c.save();
          c.beginPath();
          c.translate(x+ins[i++]*s*xFlip, y+ins[i++]*s);
          c.scale(1, ins[i++]);
          c.arc(0, 0, ins[i++]*s, ins[i++], ins[i++], false);
          c.restore();
          break;
        case 'm':
          co = ins[i++];
          drawlLine = true;
          break;
      }
      if (drawlLine) {
        c.lineTo(co*sx*xFlip+x, ins[i++]*s+y);
      }
    };
  }
}   

// Mob classes

class Mob {
  constructor(app, lists) {
    this.app = a[app];
    this.dx = this.dy = this.ax = this.ay = 0;
    this.turnScale = 0;
    lists.push(mobs);
    lists.forEach(l => l.push(this));
    this.lists = lists;
    this.ch = [];
  }
  // update
  u(d) {
    this.dx += this.ax * d;
    this.dy += this.ay * d;
    this.x += this.dx * d;
    this.y += this.dy * d;
  }

  destroy() {
    this.app = false;
    this.dead = true;
    this.lists.forEach(l => l.splice(l.indexOf(this), 1));
    this.ch.forEach(c => c.destroy());
  }

  collide(m) {
    this.destroy();
    playSound(0);
    for (var i = 0; i < 10; i++) {
      var e = new Explosion(50);
      e.x = this.x - (this.size / 2) + rand.range(0, this.size);
      e.y = this.y - (this.size / 2) + rand.range(0, this.size);
      sfx.push(e);
    }
  }
}

// RAF
var time = 0;
function raf(fn) {
  function rf(fn) {
    return window.requestAnimationFrame(function() {
      var now = Date.now();
      var elapsed = now - time;
      if (elapsed > 999) {
        elapsed = 1 / 60;
      } else {
        elapsed /= 1000;
      }
      time = now;
      fn(elapsed);
    });
  }
  return rf(function tick(elapsed) {
    fn(elapsed);
    rf(tick);
  });
}


// "Physics" (LOL)

function dist(a,b) {
  return Math.abs(a.x-b.x) + Math.abs(a.y-b.y);
}
function collide(a, b) {
  if (dist(a,b) < a.size + b.size) {
    a.collide(b);
  }
}

// Game Loop
var layers = [[],[],[]];
var mobs = [];
var sfx = [];
var enemies = [];
var players = [];
var canvas = document.querySelector('canvas');
var ctx = canvas.getContext('2d');
function renderMob(m, flip) {
  var turnScale = 1;
  if ((m.turnScale > 0 && flip) || (m.turnScale < 0 && !flip)) {
    turnScale = 1 - Math.abs(m.turnScale);
  } 
  Renderer.render(ctx,m.app,m.x,m.y,m.scale,m.blink?0:undefined,flip,turnScale);
}
var timers = [];
raf(function(d) {
  if (timers.length) {
    timers.forEach(t => {
      t[1] -= d;
      if (t[1] < 0) {
        t[0]();
        t.d = true;
      }
    })
    timers = timers.filter(f => !f.d);
  }
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  layers.forEach(l => l.forEach(m => {
    m.k && m.k(); // TODO this is only for the ship, put it somewhere
    m.u(d);
    renderMob(m);
    renderMob(m, true); // TODO: Only if m.flipped
    /*if (true) {// Debug 
      ctx.strokeStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(m.x,m.y,m.size,0,Math.PI*2,true);
      ctx.stroke();
    }*/
    const targets = m.hits == 'p' ? players : enemies;
    //m.hits && (m.hits === 'p' ? !player.dead && collide(player, m) : enemies.forEach(e => collide(e, m)));
    m.hits && targets.forEach(e => collide(e, m));
    if (
      (m.kob && m.y > H + m.size) ||
      (m.kot && m.y < -m.size) ||
      (m.kor && m.x > W + m.size) ||
      (m.kol && m.x < -m.size)) {
      m.destroy();
    }
  }))
  sfx.forEach(s => {
    s.update(d);
    s.render(ctx);
  });
  renderUI(ctx);
});

const lcdmap = [
  [1,1,1,0,1,1,1],
  [0,0,1,0,0,1,0],
  [1,0,1,1,1,0,1],
  [1,0,1,1,0,1,1],
  [0,1,1,1,0,1,0],
  [1,1,0,1,0,1,1],
  [1,1,0,1,1,1,1],
  [1,0,1,0,0,1,0],
  [1,1,1,1,1,1,1],
  [1,1,1,1,0,1,1],
]

var NS = 3;
// Score renderer
function renderScore(c, x, y, score) {
  score.forEach((d, i) => renderDigit(c, x + i * (NS * 12), y, d));
}

function renderDigit(c, x, y, digit) {
  const x6 = 6 * NS + NS;
  const x3 = 3 * NS + NS;
  const f = Renderer.render.bind(Renderer);
  const l = lcdmap[digit];
  f(c, l[0]?a.n3:a.n2, x, y - x6, NS);
  f(c, l[1]?a.n1:a.n0, x - x3, y - x3, NS);
  f(c, l[2]?a.n1:a.n0, x + x3, y - x3, NS);
  f(c, l[3]?a.n3:a.n2, x, y, NS);
  f(c, l[4]?a.n1:a.n0, x - x3, y + x3, NS);
  f(c, l[5]?a.n1:a.n0, x + x3, y + x3, NS);
  f(c, l[6]?a.n3:a.n2, x, y + x6, NS); 
}

// THE GAME!
const W = canvas.width;
const H = canvas.height;

function renderUI(c) {
  Renderer.render(c,a.scoreBack,250,600,NS*2.5,undefined,true);
  renderScore(c, 50, 550, p1.scoreArray)
  Renderer.render(c,a.scoreBack,530,600,NS*2.5);
  renderScore(c, 600, 550, p2.scoreArray)

  renderScore(c, 380, 50, waveArray)
}

var ef = { // Enemy Factory
  i(){
    this.defs={
      d: {ap:'e1',hp:20,sp:50,sc:100,size:15}, // Crasher coming down in formation
      c: {ap:'enemyFighter',hp:5,sp:200,sc:500,fp:true,size:15,scale:4}, // Cruises the screen shooting at player
      p: {ap:'platform',hp:1,sp:20,sc:0,size:80,scale:25,t:[[2,-1],[2,1]],transparent:true}, // Turret platform
      t: {ap:'e1',hp:40,sp:0,sc:200,fp:true,size:15}, // Turret
    }
  },
  b(id,x,y,dx,dy,lv=1){
    var d = this.defs[id];
    const groups = [layers[d.t?1:2]];
    if (!d.transparent) {
      groups.push(enemies);
    }
    var e = new Enemy(d.hp,d.ap,groups);
    e.x = x;
    e.y = y;
    e.dy = dy;
    e.dx = dx;
    e.score = d.sc;
    e.reactionTime = d.rt || 2000;
    e.reactionTime -= lv * 200;
    if (e.reactionTime < 200) {
      e.reactionTime = 200;
    }
    e.fireAtPlayer = d.fp;
    e.size = d.size;
    if (!d.transparent) {
      e.hits = 'p'; // Player
    }
    var s = e.scale = d.scale || 1;
    if (d.t) { // Mounted turrets
      d.t.forEach(t => {
        e.ch.push(this.b('t',x+t[0]*s,y+t[1]*s,dx,dy));
        e.ch.push(this.b('t',x+t[0]*-s,y+t[1]*s,dx,dy));
      });
    }
    e.react();
    return e;
  },
  c(id,l,y,lv) { // Cruising from one side to the other
    var d = this.defs[id];
    var x = l?(W+d.size):-d.size;
    var e = this.b(id,x,y,d.sp*(l?-1:1),0,lv);
    e.kor = !l;
    e.kol = l;
  },
  a(id,x,lv) { // Coming from above
    var d = this.defs[id];
    this.b(id,x,-100,0,d.sp,lv)
  },
  f(id,n,x,w,lv) { // Horizontal Formation
    var d = this.defs[id];
    var ix=x-w/2;
    var is=w/(n-1);
    for (var i = 0; i < n; i++) {
      this.b(id,ix+i*is,-100,0,d.sp,lv)
    }
  }
}
ef.i();

class Ship extends Mob {
  u(d) {
    super.u(d);
    // Damp
    var D = 100 * d;
    if (this.dx !== 0) {
      this.dx += (-Math.sign(this.dx) * D);
    }
    if (this.dy !== 0) {
      this.dy += (-Math.sign(this.dy) * D);
    }
    // Inertia
    if (Math.abs(this.turnScale) < 0.01) {
      this.turnScale = 0;
    } else if (this.turnScale < 0) {
      this.turnScale += 0.01;
    } else if (this.turnScale > 0) {
      this.turnScale -= 0.01;
    }
    // BOundaries
    if (this.x < 0) this.x = 0;
    if (this.x > W) this.x = W;
    if (this.y < 0) this.y = 0;
    if (this.y > H) this.y = H;
  }
  k(){
    var P = 300;
    this.ay = 0;
    this.ax = 0;
    if (isDown(this.keys[0])){ // Rise
      this.ay = -P;
    } else if (isDown(this.keys[1])){ // Sink
      this.ay = P;
    } 
    if (isDown(this.keys[2])){
      this.flipped = true;
      this.ax = -P;
      this.turnScale -= 0.02;
      if (this.turnScale < -0.5) {
        this.turnScale = -0.5;
      }
    } else if (isDown(this.keys[3])){
      this.flipped = true;
      this.ax = P;
      this.turnScale += 0.02;
      if (this.turnScale > 0.5) {
        this.turnScale = 0.5;
      }
    }
    if (isDown(this.keys[4])) {
      this.fire();
    }
  }
  fire() {
    var b = new Mob('bullet', [layers[1]]);
    b.x = this.x;
    b.y = this.y;
    b.dy = -rand.range(550, 600);
    b.size = 5;
    b.hits = 'e'; // Enemy
    b.kot = true;
    b.scale = 1;
    b.player = this;
    playSound(1);
  }
  destroyed(m) {
    this.score += m.score;
    this.updateScoreArray();
  }
  updateScoreArray() {
    this.scoreArray = [];
    var ss = '0000000'+this.score;
    ss = ss.substr(ss.length - 5)
    for (var i = 0, len = ss.length; i < len; i += 1) {
      this.scoreArray.push(+ss.charAt(i));
    }
  }
  destroy() {
    super.destroy();
    this.dead = true;
  }
}

class Enemy extends Mob {
  constructor(hp, app, lists, reactionTime) {
    super(app, lists);
    this.hp = hp;
    this.reactionTime = reactionTime;
    this.kob = true; // TODO: Reverse logic for enemies flying upwards
  }

  nearestPlayer() {
    return players.length && players.sort((a,b)=>dist(a,this)-dist(b,this))[0];
  }

  react() {
    if (this.dead)
      return;
    if (this.fireAtPlayer) {
      this.fire();
    }
    timers.push([()=>this.react(), this.reactionTime/1000]);
  }

  fire() {
    var p = this.nearestPlayer();
    if (!p) {
      return;
    }
    playSound(1);
    var b = new Mob('bullet', [layers[1]]);
    b.x = this.x;
    b.y = this.y;
    var angle = Math.atan2((p.y - this.y), (p.x - this.x));
    var speed = rand.range(250, 300);
    b.dx = Math.cos(angle) * speed;
    b.dy = Math.sin(angle) * speed;
    b.size = 5;
    b.hits = 'p';
    b.kob = true;
    b.kot = true; // TODO: Kill anywhere outside screen
    b.scale = 1;
  }

  collide(m) {
    this.hp--;
    this.blink = true;
    setTimeout(() => this.blink = false, 50);
    if (this.hp <= 0) {
      m.player.destroyed(this);
      super.collide(m);
    }
    playSound(0);
    var e = new Explosion(20);
    e.x = m.x;
    e.y = m.y;
    sfx.push(e);
    m.destroy();
  }
}

class Star extends Mob {
  destroy(m) {
    super.destroy();
    // Create a new Star
    var size = rand.range(1, 3);
    var t = new Star('star'+size, [layers[0]]);
    t.x = rand.range(0, W);
    t.y = -size;
    t.dy = rand.range(50, 100);
    t.size = size;
    t.kob = true;
    t.scale = 1;
  }
}

class Explosion {
  constructor(s){
    this.sf = s;
    this.s0 = s / 5;
    this.runTime = 0;
  }
  update(d){
    this.runTime += d;
  }
  render(c){
    var totalTime = 0.2;
    var progress = this.runTime / totalTime;
    if (progress > 1) {
      sfx.splice(sfx.indexOf(this),1);
      return;
    }
    var cut = 0.4;
    if (progress < cut) {
      // Growing ball of fire
      var segmentProgress = progress / cut;
      var size = this.s0 + segmentProgress * (this.sf-this.s0);
      c.fillStyle = '#eecc00';
      c.beginPath();
      c.arc(this.x,this.y,size,0,Math.PI*2,true);
      c.fill();
    } else {
      // Fading fire
      var segmentProgress = (progress - cut) / (1 - cut);
      var size = segmentProgress * this.sf;
      c.fillStyle = '#bb9900';
      c.beginPath();
      c.arc(this.x,this.y,this.sf,0,Math.PI*2,true);
      c.arc(this.x,this.y,size,0,Math.PI*2,false);
      c.fill();
    }
  }
}

const WH = '#ffffff';
const RD = '#ff0000';

const a = { // Appearances
  /*ship Half ovals
    'o','#dddddd','vh',0,-6,2.2,2.2,Math.PI/2,Math.PI+Math.PI/2,'f',
    'o','#000000','vh',0,-6,2,1.5,Math.PI/2,Math.PI+Math.PI/2,'f',
  ]
  */
  ship: [
    '#eeeeee','p',-2,2,-4,4,-6,0,-4,-1,-2,-4,0,-4,0,2,'f',
    'o','#0000ff','p',-3,3,-4,4,-6,4,-8,0,-6,-3,-4,-4,-5,-1,'f',
    'o','#dddddd','v',0,-6,2.2,2.2,'f',
    'o','#888888','vh',0,1,2.5,2,Math.PI,2*Math.PI,'f',
    'o','#ff3333','p',0,1,-2.5,1,-2.5,2,-1.5,3,0,3,'f',
    'o','#000000','v',0,-6,2,1.5,'f',
    'o','#ff0000','vh',0,-6,2,1.5,0.5,Math.PI-0.5,'f',
  ],
  ship2: [ // Same as ship1, just different wing color
    '#eeeeee','p',-2,2,-4,4,-6,0,-4,-1,-2,-4,0,-4,0,2,'f',
    'o','#ff0000','p',-3,3,-4,4,-6,4,-8,0,-6,-3,-4,-4,-5,-1,'f', // here
    'o','#dddddd','v',0,-6,2.2,2.2,'f',
    'o','#888888','vh',0,1,2.5,2,Math.PI,2*Math.PI,'f',
    'o','#ff3333','p',0,1,-2.5,1,-2.5,2,-1.5,3,0,3,'f',
    'o','#000000','v',0,-6,2,1.5,'f',
    'o','#ff0000','vh',0,-6,2,1.5,0.5,Math.PI-0.5,'f',
  ],
  enemyFighter: [
    '#33aa33','p',3,0,4,0,4,-6,2,-8,2,-6,3,-5,'f',
    'o','#33ff33','p',2,0,2,-4,4,0,4,2,'f',
    'o','#888888','v',0,0,1,3,'f',
    'o','#000033','v',0,0,1,2,'f',
  ],
  star1: [WH,'c',1],
  star2: [WH,'c',2],
  star3: [WH,'c',3],
  bullet: [RD,'c',4],
  e1: ['#888888','c',15,'o','#dd0000','c',5],
  platform: [
    '#eeeeee','p',3,-4,3,2,1,4,0,4,0,-2,1,-2,3,-4,'f'
  ],
  n0: ['#003300','p',-1,-2,0,-3,1,-2,1,2,0,3,-1,2,'f'], 
  n1: ['#00ff00','p',-1,-2,0,-3,1,-2,1,2,0,3,-1,2,'f'], // TODO: Optimize, same as n0, different color
  n2: ['#003300','p',-2,-1,-3,0,-2,1,2,1,3,0,2,-1,'f'],
  n3: ['#00ff00','p',-2,-1,-3,0,-2,1,2,1,3,0,2,-1,'f'], // TODO: Optimize, same as n2, different color
  scoreBack: ['#002200','a',0.7,'p',0,0,4,-12,40,-12,40,0,'f']
}


for (var i = 0; i < 50; i++) {
  var size = rand.range(1, 3);
  var t = new Star('star'+size, [layers[0]]);
  t.x = rand.range(0, W);
  t.y = rand.range(0, H);
  t.dy = rand.range(50, 100);
  t.size = size;
  t.kob = true;
  t.scale = 1;
}

var p1 = new Ship('ship', [players, layers[2]]);
p1.x = W*(1/4);
p1.y = H-100;
p1.size = 20;
p1.score = 0;
p1.updateScoreArray();
p1.scale = 2;
//p1.keys=[38,37,39,32]; //Arrow keys
p1.keys=[87,83,65,68,32];//WASD+Space

var p2 = new Ship('ship2', [players, layers[2]]);
p2.x = W*(3/4);
p2.y = H-100;
p2.size = 20;
p2.score = 0;
p2.updateScoreArray();
p2.scale = 2;
p2.keys=[56,50,52,54,48]; //Numpad

// Enemy Waves

var wave = 1;

var waveArray = [];
function updateWaveArray() {
  waveArray = [];
  var ss = '0000000'+(Math.floor(wave / 10)+1);
  ss = ss.substr(ss.length - 2)
  for (var i = 0, len = ss.length; i < len; i += 1) {
    waveArray.push(+ss.charAt(i));
  }
}

updateWaveArray();

// Generate a new wave every 5 seconds
timers.push([()=>newWave(), 5]);

function newWave(){
  // Check at least one player alive
  if (!players.filter(p=>!p.dead).length) {
    console.log("Game over");
    return;
  }
  var type = rands.range(0, 10);
  var diff = Math.floor(wave/10)+1;
  diff = wave + 1; // Test
  switch (type) {
    case 0: // Formation
    case 1: // Cruiser
      ef.f('d',rands.range(2,diff+2),W/2,rands.range(400,600),diff);
      break;
    case 2: // Cruiser
    case 3: // Cruiser
    case 4: // Cruiser
    case 5: // Cruiser
    case 6: // Cruiser
      ef.c('c',rands.b(),rands.range(100,H-100),diff)
      break;
    case 8: // Platform
    case 9: // Platform
      ef.a('p',rands.range(100,W-100),diff);
      break;
  }
  wave++;
  updateWaveArray();
  timers.push([()=>newWave(), 5]);
}

// Music
/*function playMusic(){
  with(new AudioContext)[8,9,11,13,13,15,15,15,16,16,16,16,18,18,18,20,20,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24].map((v,i)=>{with(createOscillator())v&&start(e=[17,16,15,11,14,7,10,13,3,6,9,12,2,5,8,1,4,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17][i]/5,connect(destination),frequency.value=988/1.06**v,type='sawtooth',)+stop(e+.2)})
}

playMusic();
setInterval(()=>playMusic(),4000);*/
