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

// Appearances
const p = [ // palette
  '#ffffff',
  '#ff0000'
]

const Renderer = {
  render(c,m) {
    x = m.x;
    y = m.y;
    ins = m.app;
    ins.split(":").forEach(i => {
      t = i.split(',');
      c.fillStyle = m.blink ? p[0] : p[parseInt(t[0])];
      this[t[1]](c,x,y,t.slice(2));
    });
  },
  c(c,x,y,t){
    c.beginPath();
    c.arc(x,y,t[0],0,Math.PI*2,true);
    c.closePath();
    c.fill();
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
    m.app && Renderer.render(ctx,m);
    m.hits && (m.hits === 'p' ? collide(player, m) : enemies.forEach(e => collide(e, m)));
  }))
});

// THE GAME!

class Ship extends Mob {
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
  }
}

class Enemy extends Mob {
  constructor(hp, app, lists) {
    super(app, lists);
    this.hp = hp;
  }

  collide(m) {
    this.hp--;
    this.blink = true;
    setTimeout(() => this.blink = false, 50);
    if (this.hp <= 0) {
      super.collide(m);
    }
    m.destroy();
  }
}


const a = { // Appearances
  // c - Circle radius, palette index
  ship: "0,c,20",
  star1: "0,c,1",
  star2: "0,c,2",
  star3: "0,c,3",
  bullet: "1,c,4",
  e1: "1,c,15"
}

for (var i = 0; i < 50; i++) {
  var t = new Mob('star'+rand.range(1, 3), [layers[0]]);
  t.x = rand.range(0, 800);
  t.y = rand.range(0, 600);
  t.dy = rand.range(50, 100);
}

// Replenish stars
setInterval(() => { // TODO: Replace this with something from the game loop to avoid issues when not rendering
  for (var i = 0; i < 50; i++) {
    var t = new Mob('star'+rand.range(1, 3), [layers[0]]);
    t.x = rand.range(0, 800);
    t.y = -rand.range(0, 600);
    t.dy = rand.range(50, 100);
  }
}, 3000);

var player = new Ship('ship', [layers[2]]);
player.x = 400;
player.y = 500;
player.size = 20;

// Enemies
for (var i = 0; i < 5; i++) {
  var e = new Enemy(200, 'e1', [enemies,layers[2]]);
  e.x = 100 + i * 150;
  e.y = -100;
  e.dy = 50;
  e.hits = 'p'; // Player
  e.size = 15;
}
