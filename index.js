
var canvas; 
var ctx; 
var canvasBuffer;
var fps;
var paused;
var timestamp;

//--------------------------------------------------------------------

var myConsole;
var popupElement;
var mapCanvas;
var mapCanvasCtx;
var mapCanvasBuffer;
var mapCanvasOverlay;
var mapCanvasOverlayCtx;

var x;
var y;
var velocity;
var vForwards;
var vStrafe;
var vTheta;
var theta;

var inset;
var viewWidth;
var fov;
var viewDistance;

var skyline;

var mxOld;
var myOld;
var sinTheta;
var cosTheta;
var sinThetaPlusHalfPi;
var cosThetaPlusHalfPi;

//--------------------------------------------------------------------

function getInterpolatedColor(c1, c2, t) {
  return {
    r: Math.floor(c1.r + t*(c2.r-c1.r)),
    g: Math.floor(c1.g + t*(c2.g-c1.g)),
    b: Math.floor(c1.b + t*(c2.b-c1.b)),
    a: 255
  }
}

function pset(x,y,r,g,b) {
  let offset = (x + y*canvas.width)*4;
  canvasBuffer.data[offset]=r;
  canvasBuffer.data[offset+1]=g;
  canvasBuffer.data[offset+2]=b;
  canvasBuffer.data[offset+3]=255;
}
function pget(x,y) {
  let offset = (x + y*mapCanvas.width)*4;
  return {
    r: mapCanvasBuffer.data[offset],
    g: mapCanvasBuffer.data[offset+1],
    b: mapCanvasBuffer.data[offset+2]
  }
}

function viewFrameCoord0() {
  return { 
    x: ((viewDistance-inset)*Math.cos(theta) + 0.5*fov*Math.cos(theta-0.5*Math.PI) + x)*mapCanvasOverlay.width,
    y: ((viewDistance-inset)*Math.sin(theta) + 0.5*fov*Math.sin(theta-0.5*Math.PI) + y)*mapCanvasOverlay.height
  }
}
function viewFrameCoord1() {
  return { 
    x: ((viewDistance-inset)*Math.cos(theta) + 0.5*fov*Math.cos(theta+0.5*Math.PI) + x)*mapCanvasOverlay.width,
    y: ((viewDistance-inset)*Math.sin(theta) + 0.5*fov*Math.sin(theta+0.5*Math.PI) + y)*mapCanvasOverlay.height
  }
}
function viewFrameCoord2() {
  return { 
    x: (inset*Math.cos(theta+Math.PI) + 0.5*viewWidth*Math.cos(theta+0.5*Math.PI) + x)*mapCanvasOverlay.width,
    y: (inset*Math.sin(theta+Math.PI) + 0.5*viewWidth*Math.sin(theta+0.5*Math.PI) + y)*mapCanvasOverlay.height
  }
}
function viewFrameCoord3() {
  return { 
    x: (inset*Math.cos(theta+Math.PI) + 0.5*viewWidth*Math.cos(theta-0.5*Math.PI) + x)*mapCanvasOverlay.width,
    y: (inset*Math.sin(theta+Math.PI) + 0.5*viewWidth*Math.sin(theta-0.5*Math.PI) + y)*mapCanvasOverlay.height
  }
}

function drawMapViewframe() {

  mapCanvasOverlayCtx.fillStyle = 'red';
  mapCanvasOverlayCtx.beginPath();
  mapCanvasOverlayCtx.arc(
    x*mapCanvasOverlay.width,
    y*mapCanvasOverlay.height,
    5, 0, 2*Math.PI);
  mapCanvasOverlayCtx.fill();

  let vc0 = viewFrameCoord0();
  let vc1 = viewFrameCoord1();
  let vc2 = viewFrameCoord2();
  let vc3 = viewFrameCoord3();

  mapCanvasOverlayCtx.strokeStyle = 'gray';
  mapCanvasOverlayCtx.beginPath();
  mapCanvasOverlayCtx.moveTo(vc0.x, vc0.y);
  mapCanvasOverlayCtx.lineTo(vc1.x, vc1.y);
  mapCanvasOverlayCtx.stroke();

  mapCanvasOverlayCtx.strokeStyle = 'blue';
  mapCanvasOverlayCtx.beginPath();
  mapCanvasOverlayCtx.moveTo(vc2.x, vc2.y);
  mapCanvasOverlayCtx.lineTo(vc3.x, vc3.y);
  mapCanvasOverlayCtx.stroke();

  mapCanvasOverlayCtx.strokeStyle = 'yellow';
  mapCanvasOverlayCtx.beginPath();
  mapCanvasOverlayCtx.moveTo(vc1.x, vc1.y);
  mapCanvasOverlayCtx.lineTo(vc2.x, vc2.y);
  mapCanvasOverlayCtx.stroke();

  mapCanvasOverlayCtx.strokeStyle = 'green';
  mapCanvasOverlayCtx.beginPath();
  mapCanvasOverlayCtx.moveTo(vc3.x, vc3.y);
  mapCanvasOverlayCtx.lineTo(vc0.x, vc0.y);
  mapCanvasOverlayCtx.stroke();

}

function modulus(n, m) {
  return ((n % m) + m) % m;
}

function run() {

  if (popupElement) {
    mapCanvasOverlayCtx.clearRect(0,0,mapCanvasOverlay.width,mapCanvasOverlay.height);
    drawMapViewframe();
  }

  let u;
  let v;
  let z;
  let c;
  let ch = Math.floor(skyline*canvas.height);
  let mapX;
  let mapY;
  for (let cy = -0.5*ch; cy < 0.5*ch; cy++) {
    z = viewDistance*3*((cy+(0.5*ch))/(ch));
    for (let cx = -0.5*canvas.width; cx < 0.5*canvas.width; cx++) {
      u = fov*(cx / z);
      v = cy / z;
      mapX = Math.floor(mapCanvas.width*x + u*cosTheta - v*sinTheta);
      mapY = Math.floor(mapCanvas.height*y + u*sinTheta + v*cosTheta);
      modulus(mapX, mapCanvas.width) === mapX && modulus(mapY, mapCanvas.height) === mapY ?
        c = pget(mapX, mapY)
      :
        c = { r: 0, g: 255, b: 0 };
      pset(cx + 0.5*canvas.width, cy + 0.5*ch + (canvas.height - ch),c.r,c.g,c.b);
    }
  }

  //theta += 0.01;
  x = x - vForwards*cosThetaPlusHalfPi + vStrafe*cosTheta;
  y = y - vForwards*sinThetaPlusHalfPi + vStrafe*sinTheta;


  ctx.putImageData(canvasBuffer, 0, 0);

  fps.innerHTML = (1000 / (performance.now() - timestamp)).toFixed(2);
  timestamp = performance.now();
  if (!paused) window.requestAnimationFrame(run);
}

function init() {

  canvas = document.getElementById('canvas');
  canvas.width = 1280 / 2; //canvas.parentElement.clientWidth;
  canvas.height = 720 / 2; //canvas.parentElement.clientHeight;

  ctx = canvas.getContext('2d');
  let imgData = ctx.getImageData(0,0,canvas.width, canvas.height);
  canvasBuffer = ctx.createImageData(imgData);

  paused = false;
  document.getElementById('pauseButton').addEventListener('click', () => {
    paused = !paused;
    
    if (!paused) {
      timestamp = performance.now();
      run();
    }
  });

  //--------------------------------------------------------------------

  x = 0.5;
  y = 0.5;
  theta = 0;
  sinTheta = Math.sin(theta);
  cosTheta = Math.cos(theta);
  sinThetaPlusHalfPi = Math.sin(theta + 0.5*Math.PI);
  cosThetaPlusHalfPi = Math.cos(theta + 0.5*Math.PI);

  velocity = 0.0025;
  vTheta = Math.PI/360;
  vForwards = 0;
  vStrafe = 0;

  inset = 0.00;
  viewWidth = 0.08;
  fov = 0.18;
  viewDistance = 0.42;

  skyline = 0.5;

  myConsole = document.getElementById('console');
  const mapImg = new Image();
  mapImg.addEventListener('load', () => {

    myConsole.innerHTML = 'map loaded successfully';
    
    mapCanvas = document.createElement('canvas');
    mapCanvas.width = 1000;
    mapCanvas.height = 1000;

    mapCanvasCtx = mapCanvas.getContext('2d');
    mapCanvasCtx.drawImage(mapImg, 0, 0, mapCanvas.width, mapCanvas.height);
    mapCanvasBuffer = mapCanvasCtx.getImageData(0,0,mapCanvas.width,mapCanvas.height);

    mapCanvasOverlay = document.createElement('canvas');
    mapCanvasOverlay.width = mapCanvas.width;
    mapCanvasOverlay.height = mapCanvas.height;
    mapCanvasOverlayCtx = mapCanvasOverlay.getContext('2d');

    var popupWidth = 256;
    var popupHeight = 256;
    document.getElementById('mapButton').addEventListener('click', () => {

      popupElement = window.open('', 'map', `width=${popupWidth},height=${popupHeight},resizeable=no`);
      // mapCanvas.style.width = `${popupWidth}px`; 
      // mapCanvas.style.height = `${popupHeight}px`;
      // mapCanvasOverlay.style.width = `${popupWidth}px`;
      // mapCanvasOverlay.style.height = `${popupHeight}px`;

      mapCanvas.style.width = `100%`; 
      mapCanvas.style.height = `100%`;
      mapCanvasOverlay.style.width = `100%`;
      mapCanvasOverlay.style.height = `100%`;

      popupElement.document.body.style.padding = '0px';
      popupElement.document.body.style.margin = '0px';
      popupElement.document.body.style.position = 'relative';
      popupElement.document.body.appendChild(mapCanvas);

      mapCanvasOverlay.style.position = 'absolute';
      mapCanvasOverlay.style.top = '0';
      mapCanvasOverlay.style.left = '0';
      popupElement.document.body.appendChild(mapCanvasOverlay);
  
      popupElement.addEventListener('beforeunload', () => popupElement = null);
    });

    document.body.addEventListener('keydown', e => {
      switch(e.key) {
        case 'w':
          if (vForwards === -velocity) vForwards = 0; else vForwards = velocity;
          //vForwards = velocity;
          break;
        case 's':
          if (vForwards === velocity) vForwards = 0; else vForwards = -velocity;
          //vForwards = -velocity;
          break;
        case 'a':
          if (vStrafe === velocity) vStrafe = 0; else vStrafe = -velocity;
          break;
        case 'd':
          if (vStrafe === -velocity) vStrafe = 0; else vStrafe = velocity;
          break;
      }
    });
    document.body.addEventListener('keyup', e => {
      switch(e.key) {
        case 'w' || 's':
          vForwards = 0;
          break;
        case 'a' || 'd':
          vStrafe = 0;
          break;
      }
    });

    document.body.addEventListener('mousemove', e => {
      if (mxOld) {
        let dx = e.clientX - mxOld;
        theta += dx*vTheta;
        sinTheta = Math.sin(theta);
        cosTheta = Math.cos(theta);
        sinThetaPlusHalfPi = Math.sin(theta + 0.5*Math.PI);
        cosThetaPlusHalfPi = Math.cos(theta + 0.5*Math.PI);
      }
      mxOld = e.clientX;
    });

    //document.getElementById('controlsTable').addEventListener('mousemove', e => e.stopPropagation());
    //document.getElementById('inset').value = (inset*100).toString();
    //document.getElementById('inset').addEventListener('input', e => inset = parseInt(e.target.value)/100);
    //document.getElementById('view-width').value = (viewWidth*100).toString();
    //document.getElementById('view-width').addEventListener('input', e => viewWidth = parseInt(e.target.value)/100);
    document.getElementById('fov').value = (fov*100).toString();
    document.getElementById('fov').addEventListener('input', e => fov = parseInt(e.target.value)/100);
    document.getElementById('view-distance').value = (viewDistance*100).toString();
    document.getElementById('view-distance').addEventListener('input', e => viewDistance = parseInt(e.target.value)/100);
    document.getElementById('skyline').value = (skyline*100).toString();
    document.getElementById('skyline').addEventListener('input', e => skyline = parseInt(e.target.value)/100);

    fps = document.getElementById('fps');
    timestamp = performance.now();
  
    run();
  });
  mapImg.addEventListener('error', err => {
    myConsole.innerHTML = 'map failed to load';
  });
  mapImg.src = './SNES_Bowser_Castle_1.png';

  //--------------------------------------------------------------------

}