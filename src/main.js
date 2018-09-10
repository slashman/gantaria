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
          c.closePath();
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
          c.closePath();
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
  }

  collide(m) {
    this.destroy();
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
    renderMob(m, true);
    m.hits && (m.hits === 'p' ? !player.dead && collide(player, m) : enemies.forEach(e => collide(e, m)));
    if (
      (m.kob && m.y > H + m.size) ||
      (m.kot && m.y < -m.size) ||
      (m.kor && m.x > W + m.size) ||
      (m.kol && m.x < -m.size)) {
      m.destroy();
    }
  }))
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
  Renderer.render(c,a.scoreBack,530,600,NS*2.5);
  renderScore(c, 600, 550, player.scoreArray)
}

var ef = { // Enemy Factory
  i(){
    this.defs={
      d: {ap:'e1',hp:20,sp:50,sc:100,size:15}, // Crasher coming down in formation
      c: {ap:'e1',hp:5,sp:200,sc:500,fp:true,size:15} // Cruises the screen shooting at player
    }
  },
  b(id,x,y,dx,dy){
    var d = this.defs[id];
    var e = new Enemy(d.hp,d.ap,[enemies,layers[2]]);
    e.x = x;
    e.y = y;
    e.dy = dy;
    e.dx = dx;
    e.score = d.sc;
    e.reactionTime = d.rt || 2000;
    e.fireAtPlayer = d.fp;
    e.size = d.size;
    e.hits = 'p'; // Player
    e.scale = 1;
    e.react();
    return e;
  },
  c(id,l,y) {
    var d = this.defs[id];
    var x = l?(W+d.size):-d.size;
    var e = this.b(id,x,y,d.sp*(l?-1:1),0);
    e.kor = !l;
    e.kol = l;
  },
  f(id,n,x,w) {
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
    if (isDown(38)){ // Rise
      this.ay = -P;
    } else if (isDown(40)){ // Sink
      this.ay = P;
    } 
    if (isDown(37)){
      this.flipped = true;
      this.ax = -P;
      this.turnScale -= 0.02;
      if (this.turnScale < -0.5) {
        this.turnScale = -0.5;
      }
    } else if (isDown(39)){
      this.flipped = true;
      this.ax = P;
      this.turnScale += 0.02;
      if (this.turnScale > 0.5) {
        this.turnScale = 0.5;
      }
    }
    if (isDown(32)) {
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
    return players.length && players.sort((a,b)=>dist(a,this)-dist(b.this))[0];
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
      player.destroyed(this);
      super.collide(m);
    }
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
  star1: [WH,'c',1],
  star2: [WH,'c',2],
  star3: [WH,'c',3],
  bullet: [RD,'c',4],
  e1: [RD,'c',15],
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

var player = new Ship('ship', [players, layers[2]]);
player.x = W/2;
player.y = H-100;
player.size = 20;
player.score = 0;
player.updateScoreArray();
player.scale = 2;

// Enemy Waves
ef.f('d',5,W/2,600);
ef.c('c',false,200); // Cruise left to right at 200 Y
ef.c('c',true,400);