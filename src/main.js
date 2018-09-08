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
  render(c,ins,x,y,s,over) {
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
          c.moveTo(ins[i++]*s+x, ins[i++]*s+y);
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
      }
      if (drawlLine) {
        c.lineTo(co*s+x, ins[i++]*s+y);
      }
    };
  }
}   

// Mob classes

class Mob {
  constructor(app, lists) {
    this.app = a[app];
    this.dx = this.dy = this.ax = this.ay = 0;
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
function collide(a, b) {
  var dist = Math.abs(a.x-b.x) + Math.abs(a.y-b.y);
  if (dist < a.size + b.size) {
    a.collide(b);
  }
}

// Game Loop
var layers = [[],[],[]];
var mobs = [];
var enemies = [];
var canvas = document.querySelector('canvas');
var ctx = canvas.getContext('2d');
raf(function(d) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  layers.forEach(l => l.forEach(m => {
    m.k && m.k(); // TODO this is only for the ship, put it somewhere
    m.u(d);
    m.app && Renderer.render(ctx,m.app,m.x,m.y,1,m.blink?0:undefined);
    m.hits && (m.hits === 'p' ? !player.dead && collide(player, m) : enemies.forEach(e => collide(e, m)));
    if (m.kob && m.y > canvas.height + m.size) { // Kill on bottom
      m.destroy();
    }
    if (m.kot && m.y < -m.size) { // Kill on top
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

function renderUI(c) {
  Renderer.render(c,a.scoreBack,530,600,NS*2.5);
  renderScore(c, 600, 550, player.scoreArray)
}

class Ship extends Mob {
  u(d) {
    super.u(d);
    var D = 100 * d;
    if (this.dx !== 0) {
      this.dx += (-Math.sign(this.dx) * D);
    }
    if (this.dy !== 0) {
      this.dy += (-Math.sign(this.dy) * D);
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
    } else if (isDown(39)){
      this.flipped = true;
      this.ax = P;
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
  constructor(hp, app, lists) {
    super(app, lists);
    this.hp = hp;
    this.kob = true; // TODO: Reverse logic for enemies flying upwards
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
    t.x = rand.range(0, 800);
    t.y = -size;
    t.dy = rand.range(50, 100);
    t.size = size;
    t.kob = true;
  }
}

const WH = '#ffffff';
const RD = '#ff0000';

const a = { // Appearances
  // c - Circle radius, palette index
  ship: [WH,'c',20],
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
  t.x = rand.range(0, 800);
  t.y = rand.range(0, 600);
  t.dy = rand.range(50, 100);
  t.size = size;
  t.kob = true;
}

var player = new Ship('ship', [layers[2]]);
player.x = 400;
player.y = 500;
player.size = 20;
player.score = 0;
player.updateScoreArray();

// Enemies
for (var i = 0; i < 5; i++) {
  var e = new Enemy(20, 'e1', [enemies,layers[2]]);
  e.x = 100 + i * 150;
  e.y = -100;
  e.dy = 50;
  e.hits = 'p'; // Player
  e.size = 15;
  e.score = 100;
}