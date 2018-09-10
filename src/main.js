// Random
var rand = {
  int: function(max) {
    return Math.random() * (max || 0xfffffff) | 0;
  },
  range: function(min, max) {
    return this.int(max - min) + min;
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
raf(function(d) {
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
}

var ef = { // Enemy Factory
  i(){
    this.defs={
      d: {ap:'e1',hp:20,sp:50,sc:100,size:15}, // Crasher coming down in formation
      c: {ap:'e1',hp:5,sp:200,sc:500,fp:true,size:15}, // Cruises the screen shooting at player
      p: {ap:'platform',hp:1,sp:20,sc:0,size:80,scale:25,t:[[2,-1],[2,1]],transparent:true}, // Turret platform
      t: {ap:'e1',hp:40,sp:0,sc:0,fp:true,size:15}, // Turret
    }
  },
  b(id,x,y,dx,dy){
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
  c(id,l,y) { // Cruising from one side to the other
    var d = this.defs[id];
    var x = l?(W+d.size):-d.size;
    var e = this.b(id,x,y,d.sp*(l?-1:1),0);
    e.kor = !l;
    e.kol = l;
  },
  a(id,x) { // Coming from above
    var d = this.defs[id];
    this.b(id,x,-100,0,d.sp)
  },
  f(id,n,x,w) { // Horizontal Formation
    var d = this.defs[id];
    var ix=x-w/2;
    var is=w/n;
    for (var i = 0; i < n; i++) {
      this.b(id,ix+i*is,-100,0,d.sp)
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
    setTimeout(()=>this.react(), this.reactionTime)
  }

  fire() {
    var p = this.nearestPlayer();
    if (!p) {
      return;
    }
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
      //player.destroyed(this); // Who shot the bullet?
      super.collide(m);
    }
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
      c.fillStyle = '#ffff00';
      c.beginPath();
      c.arc(this.x,this.y,size,0,Math.PI*2,true);
      c.fill();
    } else {
      // Fading fire
      var segmentProgress = (progress - cut) / (1 - cut);
      var size = segmentProgress * this.sf;
      c.fillStyle = '#ffff00';
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
  star1: [WH,'c',1],
  star2: [WH,'c',2],
  star3: [WH,'c',3],
  bullet: [RD,'c',4],
  e1: [RD,'c',15],
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
ef.f('d',5,W/2,600);
setTimeout(()=>ef.c('c',false,200), 2000);// Cruise left to right at 200 Y
setTimeout(()=>ef.c('c',true,400), 6000);
ef.a('p',200); // First platform
setTimeout(()=>ef.a('p',600), 5000); // Second platform

var e = new Explosion(50);
e.x = 300;
e.y = 300;
sfx.push(e);