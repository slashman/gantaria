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
  render(c,x,y,ins) {
    ins.split(":").forEach(i => {
      t = i.split(',');
      c.fillStyle = p[parseInt(t[0])];
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
  constructor(app) {
    this.app = a[app];
    this.dx = this.dy = this.ax = this.ay = 0;
  }
  // update
  u(d) {
    this.dx += this.ax * d;
    this.dy += this.ay * d;
    this.x += this.dx * d;
    this.y += this.dy * d;
  }
}

class Ship extends Mob {
  // Keyboard
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
      // TOOD: Throothle?
      this.fire();
    }
  }
  fire() {
    var b = new Mob('bullet');
    b.x = this.x;
    b.y = this.y;
    b.dy = -rand.range(550, 600);
    mobs.push(b);
    layers[1].push(b);
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

// Game Loop
var layers = [[],[],[]];
var mobs = [];
var canvas = document.querySelector('canvas');
var ctx = canvas.getContext('2d');
raf(function(d) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  layers.forEach(l => l.forEach(m => {
    m.k && m.k(); // TODO this is only for the ship, put it somewhere
    m.u(d);
    Renderer.render(ctx,m.x,m.y,m.app);
  }))
});

// Game Setup

const a = { // Appearances
  // c - Circle radius, palette index
  ship: "0,c,20",
  star1: "0,c,1",
  star2: "0,c,2",
  star3: "0,c,3",
  bullet: "1,c,4" 
}

for (var i = 0; i < 50; i++) {
  var t = new Mob('star'+rand.range(1, 3), 0);
  t.x = rand.range(0, 800);
  t.y = rand.range(0, 600);
  t.dy = rand.range(50, 100);
  mobs.push(t);
  layers[0].push(t);
}

setInterval(() => {
  for (var i = 0; i < 50; i++) {
    var t = new Mob('star'+rand.range(1, 3), 0);
    t.x = rand.range(0, 800);
    t.y = -rand.range(0, 600);
    t.dy = rand.range(50, 100);
    mobs.push(t);
    layers[0].push(t);
  }  
}, 3000);

var s = new Ship('ship', 2);
s.x = 400;
s.y = 500;
mobs.push(s);
layers[2].push(s);