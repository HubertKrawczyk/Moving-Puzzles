/**
 * Javasript puzzle
 * 
 * @author Hubert Krawczyk
 * © 2019
 */



function getMouseXY(e) {
  var boundingRect = canvas.getBoundingClientRect();
  var offsetX = boundingRect.left;
  var offsetY = boundingRect.top;
  var w = (boundingRect.width - canvas.width) / 2;
  var h = (boundingRect.height - canvas.height) / 2;
  offsetX += w;
  offsetY += h;
  var mx = Math.round(e.clientX - offsetX);
  var my = Math.round(e.clientY - offsetY);
  return { x: mx, y: my };
}



function lineTwoPoints(x1, y1, x2, y2, colour) {
  context.strokeStyle = colour;
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}

//html elements
var selectImage = document.getElementById("selectImage");
var showButton = document.getElementById("showButton");
var resetButton = document.getElementById("resetButton");
var puzzleSizeRange = document.getElementById("puzzleSizeRange");
var puzzleSpeedRange = document.getElementById("puzzleSpeedRange");
var gridCheckbox = document.getElementById("gridCheckbox");
var uploadImage = document.getElementById("uploadImage");
var fileReader = new FileReader();
var canvas = document.getElementById('puzzleCanvas');
var miniCanvas = document.getElementById('miniCanvas');
var context = canvas.getContext('2d');

//canvas properties
canvas.width = window.innerWidth;
canvas.height = canvas.width/2;
miniCanvas.width = canvas.width/2.4;
miniCanvas.height = miniCanvas.width/1.5;
if(miniCanvas.width>500){
    miniCanvas.width = 500
    miniCanvas.height = 334
}
const WIDTH = canvas.width;
const PUZZLE_WIDTH = WIDTH/1.33;
const HEIGHT = canvas.height;
var showGrid = gridCheckbox.checked;

//puzzle properties
var tileSize;
var globalScaleV;
var horizontalTiles;
var verticalTiles;
var completionTable = [];
var puzzleTable = [];
var puzzlesLeft;

//interaction with small puzzles
var dragging = false;
var dragoffX = 0;
var dragoffY = 0;
var selection = null;
var startDragX = 0;
var startDragY = 0;
var contextDragCopy = null;

//needed for animation purposes
var movingPuzzlesInterval = null;
var imageBlendInterval = null;
var blendCounter = 11;

//images & equivalent bit data
var puzzleImage = new Image();
var woodImage = new Image();
var canvasBackgroundImage = new Image();
var imageData;
var woodImageData;
var canvasBackgroundata;


//start / reset
function start() {
  drawLoadMessage();
  adjustTileSizes();

  canvasBackgroundImage = new Image();
  canvasBackgroundImage.src = "public/images/canvas.jpg";
  //now canvas... .onload should trigger
}

function init() {
  resetCompletionTable();
  clearInterval(movingPuzzlesInterval);
  clearInterval(imageBlendInterval);
  blendCounter = 11;
}

function drawLoadMessage() {
  context.fillStyle = 'black';
  context.font = "30px Arial"
  context.fillText("Please Wait...", WIDTH / 2 - 100, HEIGHT / 2 - 50);
}


start();



resetButton.onclick=function(){
  location.reload();
}
//load images in order: canvasBackground, rightWood, puzzle image
canvasBackgroundImage.onload = function () {
  var newCanvas = $("<canvas>").attr("width", PUZZLE_WIDTH).attr("height", HEIGHT)[0];

  tempContext = newCanvas.getContext("2d");
  tempContext.drawImage(canvasBackgroundImage, 0, 0, canvasBackgroundImage.width, canvasBackgroundImage.height, 0, 0, PUZZLE_WIDTH, HEIGHT);

  var newImgData = tempContext.getImageData(0, 0, PUZZLE_WIDTH, HEIGHT);
  canvasBackgroundData = newImgData;
  //load wood image
  woodImage.src = "public/images/wood.jpg#" + new Date().getTime();
}
woodImage.onload = function () {
  var newCanvas = $("<canvas>").attr("width", WIDTH - PUZZLE_WIDTH).attr("height", HEIGHT)[0];

  tempContext = newCanvas.getContext("2d");
  tempContext.drawImage(woodImage, 0, 0, woodImage.width, woodImage.height, 0, 0, WIDTH - PUZZLE_WIDTH, HEIGHT);

  var newImgData = tempContext.getImageData(0, 0, WIDTH - PUZZLE_WIDTH, HEIGHT);
  woodImageData = newImgData;
  //load puzzle image
  chooseImage();
  init();
}
puzzleImage.onload = function () {
  reloadImage();
  setPuzzleTable();
  resetCompletionTable();
  clearAll();
  displayMiniPuzzles();
  showImage();
  displayMiniCanvas();
};



selectImage.onchange = function (e) { clearWhite(); drawLoadMessage(); chooseImage(); resetCompletionTable(); };

function chooseImage() {
  switch (selectImage.value.toLowerCase()) {
    case 'car':
      puzzleImage.src = "public/images/images/car.jpg";
      break;
    case 'cow':
      puzzleImage.src = "public/images/images/cow.jpg";
      break;
    case 'collider':
      puzzleImage.src = "public/images/images/collider.jpg";
      break;
    default:
      puzzleImage.src = "public/images/images/collider.jpg";
  }
}
gridCheckbox.onchange = function () {
  if(gridCheckbox.checked)
    showGrid = true;
  else
    showGrid = false;
}
//(number of puzzles / difficulty) change
puzzleSizeRange.onchange = function () {
  adjustTileSizes();
  setPuzzleTable();
  clearAll();
  init();
  displayMiniPuzzles();
  displayMiniCanvas();
}
puzzleSpeedRange.onchange = function () { adjustSpeed(); }

function adjustSpeed() {
  var speed = 3;
  switch (puzzleSpeedRange.value) {
    case '0':
      speed = 0;
      break;
    case '1':
      speed = 6;
      break;
    case '2':
      speed = 15;
      break;
    case '3':
      speed = 50;
      break;
    default:
      speed = 3;
  }
  //apply new speed to every puzzle piece
  if (puzzleTable != null && puzzleTable.length != 0) {
    for (var i = 0; i < puzzleTable.length; i++) {
      puzzleTable[i].changeSpeed(speed)
    }
  }
}
function adjustTileSizes() {
  switch (puzzleSizeRange.value) {
    case '0':
      tileSize = Math.ceil(PUZZLE_WIDTH/3);
      break;
    case '1':
      tileSize = Math.ceil(PUZZLE_WIDTH/6);
      break;
    case '2':
      tileSize = Math.ceil(PUZZLE_WIDTH/12);
      break;
    default:
      tileSize = Math.ceil(PUZZLE_WIDTH/6);
  }
  globalScaleV = 1 / (tileSize / 70);
  horizontalTiles = Math.round(PUZZLE_WIDTH / tileSize);
  verticalTiles = Math.round(HEIGHT / tileSize);
}
//load new image data
function reloadImage() {
  clearInterval(imageBlendInterval);
  var newCanvas = $("<canvas>").attr("width", PUZZLE_WIDTH).attr("height", HEIGHT)[0];

  tempContext = newCanvas.getContext("2d");
  tempContext.drawImage(puzzleImage, 0, 0, puzzleImage.width, puzzleImage.height, 0, 0, PUZZLE_WIDTH, HEIGHT);

  var newImgData = tempContext.getImageData(0, 0, PUZZLE_WIDTH, HEIGHT);
  imageData = newImgData;
}
//bottom mini canvas; draws image then draws lines to distinguish between puzzle pieces
function displayMiniCanvas() {
  var ctx = miniCanvas.getContext("2d");
  var miniWidth = miniCanvas.width;
  var miniHeight = miniCanvas.height;
  miniTileWidth = miniWidth / horizontalTiles;

  ctx.drawImage(puzzleImage, 0, 0, puzzleImage.width, puzzleImage.height, 0, 0,
     miniCanvas.width, miniCanvas.height);
  //horizontal lines
  for (j = 0; j <= horizontalTiles; j++) {
    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(j * miniTileWidth, 0);
    ctx.lineTo(j * miniTileWidth, miniHeight);
    ctx.stroke();
  }
  //vertical lines
  for (i = 0; i <= verticalTiles; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * miniTileWidth);
    ctx.lineTo(miniWidth, i * miniTileWidth);
    ctx.stroke();
  }
}

uploadImage.onchange = function () {
  clearInterval(imageBlendInterval);
  clearWhite();
  drawLoadMessage();
  var file = this.files[0];
  if (file != null)
    fileReader.readAsDataURL(file);
}
fileReader.onload = function (e) {
  puzzleImage.src = e.target.result;
}

function drawGrid(){
    context.strokeStyle = "black";
    context.lineWidth = 1;
    for (i = 0; i < verticalTiles; i++) {
        context.beginPath();
        context.moveTo(0, i * tileSize);
        context.lineTo(PUZZLE_WIDTH, i * tileSize);
        context.closePath();
        context.stroke();
    }
    for (i = 0;i < horizontalTiles; i++){
        context.beginPath();
        context.moveTo(i * tileSize,0);
        context.lineTo(i * tileSize,HEIGHT);
        context.closePath();
        context.stroke();
    }
    
}
function drawTile(i, j) {
  posX = tileSize * j;
  posY = tileSize * i;
  px = tileSize;
  context.putImageData(imageData, 0, 0, posX, posY, tileSize, tileSize);
}
//frame around a tile
function drawTileFrame(i, j) {
  posX = tileSize * j;
  posY = tileSize * i;
  px = tileSize;
  context.strokeStyle = 'red';
  context.beginPath();
  context.rect(posX, posY, px, px);
  context.stroke();
}
function congratulations(){
  var cWidth = 250;
  var cHeight = 100;
  //rainbow backgrond
  var colours = ['purple', 'blue', 'green', 'yellow', 'orange', 'red'];
  var colorBarWidth = cWidth/colours.length;
  for(var i = 0 ; i<colours.length; i++){
    context.fillStyle = colours[i];
    context.fillRect((PUZZLE_WIDTH - cWidth) / 2 + colorBarWidth*i, (HEIGHT - cHeight) / 2, colorBarWidth, cHeight);
  }
  context.beginPath();
  context.font = "30px Arial";
  context.fillStyle = 'black';
  context.fillText("Congratulations!", (PUZZLE_WIDTH - cWidth) / 2 +20, (HEIGHT - cHeight) / 2+60);
  context.stroke();
}
//set all values to false
function resetCompletionTable() {
  completionTable = [];
  for (i = 0; i < verticalTiles; i++) {
    completionTable[i] = [];
    for (j = 0; j < horizontalTiles; j++)
      completionTable[i][j] = false;
  }
  puzzlesLeft = verticalTiles * horizontalTiles;
  //le.log("New game, puzzles left: "+ puzzlesLeft);
}
//scale the image and then make a set of puzzle pieces
function setPuzzleTable() {
  puzzleTable = [];
  var newCanvas = $("<canvas>").attr("width", PUZZLE_WIDTH).attr("height", HEIGHT)[0];

  var ctx = newCanvas.getContext("2d");
  ctx.drawImage(puzzleImage, 0, 0, puzzleImage.width, puzzleImage.height, 0, 0, PUZZLE_WIDTH, HEIGHT);

  for (i = 0; i < verticalTiles; i++) {
    for (j = 0; j < horizontalTiles; j++) {
      var scaleV = globalScaleV;
      var position = i * horizontalTiles + j

      puzzleTable[position] = new partPuzzle(Math.random() * ((WIDTH - PUZZLE_WIDTH) / scaleV - tileSize), Math.random() * ((HEIGHT) / scaleV - tileSize),
        ctx.getImageData(j * tileSize, i * tileSize, tileSize, tileSize), i, j, scaleV);
    }
  }
  adjustSpeed();
}

function displayMiniPuzzles() {
  for (var i = 0; i < puzzleTable.length; i++) {
    if (puzzleTable[i].alive && puzzleTable[i] != selection)
      puzzleTable[i].draw();
  }
}
//TODO - get rid of sclave thing (draw a scaled image in setPuzzleTable or smth)
class partPuzzle {
  constructor(x, y, partData, i, j, scaleV) {
    this.x = x;
    this.y = y;
    this.i = i;
    this.j = j;
    this.scaleV = scaleV;
    this.alive = true;
    var random = Math.random();
    this.speed = 5;
    if (random > 0.5)
      this.dx = this.speed;
    else
      this.dx = -this.speed;
    random = Math.random();
    if (random > 0.5)
      this.dy = this.speed;
    else
      this.dy = -this.speed;


    this.newCanvas = $("<canvas>")
      .attr("width", PUZZLE_WIDTH)
      .attr("height", HEIGHT)[0];

    var newContext = this.newCanvas.getContext("2d");

    newContext.putImageData(partData, 0, 0);
  }


  kill() {
    this.alive = false;
  }
  changeSpeed(newSpeed) {
    this.speed = newSpeed;
    if (this.dx > 0)
      this.dx = -(1 - Math.random() * 0.5) * (this.speed);
    else
      this.dx = (1 - Math.random() * 0.5) * (this.speed);
    if (this.dy > 0)
      this.dy = -(1 - Math.random() * 0.5) * this.speed;
    else
      this.dy = (1 - Math.random() * 0.5) * this.speed;



  }
  draw() {
    if (!dragging && this.speed != 0) {

      if ((this.x + this.dx) <= 0 || ((this.x + this.dx) >= (WIDTH - PUZZLE_WIDTH) / this.scaleV - tileSize)) {
        if (this.dx > 0)
          this.dx = -(1 - Math.random() * 0.5) * (this.speed);
        else
          this.dx = (1 - Math.random() * 0.5) * (this.speed);
      }
      if ((this.y + this.dy) <= 0 || ((this.y + this.dy) >= (HEIGHT) / this.scaleV - tileSize)) {
        if (this.dy > 0)
          this.dy = -(1 - Math.random() * 0.5) * this.speed;
        else
          this.dy = (1 - Math.random() * 0.5) * this.speed;
      }
      this.x = this.x + this.dx;
      this.y = this.y + this.dy;
    }

    //cautious check , reset tile coords if somethings goes wrong (by changing speed i.e.)
    if (!dragging)
      if (this.x <= 0 || (this.x >= (WIDTH - PUZZLE_WIDTH) / this.scaleV - tileSize) || this.y <= 0 ||
        this.y >= (HEIGHT) / this.scaleV - tileSize) {
        this.x = 100;
        this.y = 100;
      }

    context.scale(this.scaleV, this.scaleV);
    context.drawImage(this.newCanvas, PUZZLE_WIDTH * (1 / this.scaleV) + this.x, this.y);
    context.scale(1 / this.scaleV, 1 / this.scaleV);
  }
  //checks if mouse is selecting this tile
  contains(mx, my) {
    if (mx >= this.x * this.scaleV && mx <= (this.x * this.scaleV + tileSize * this.scaleV) && my >= this.y * this.scaleV && my <= (this.y * this.scaleV + tileSize * this.scaleV))
      return true;
    else
      return false;

  }
}

canvas.onmousedown = function (e) {
  if (blendCounter == 11) {
    clearInterval(imageBlendInterval);
    var pos = getMouseXY(e);
    if (pos.x >= PUZZLE_WIDTH && !dragging) {
      var selections = puzzleTable;

      for (var i = selections.length - 1; i >= 0; i--) {
        if (selections[i].alive && selections[i].contains(pos.x - PUZZLE_WIDTH, pos.y)) {

          var mySel = selections[i];

          dragging = true;
          selection = mySel;
          startDragX = mySel.x;
          startDragY = mySel.y;
          mySel.scaleV = globalScaleV;

          dragoffX = (pos.x - PUZZLE_WIDTH - mySel.x * mySel.scaleV) / mySel.scaleV;
          dragoffY = (pos.y - mySel.y * mySel.scaleV) / mySel.scaleV;
          clearAll();
          drawCanvas();
          contextDragCopy = context.getImageData(0, 0, WIDTH, HEIGHT);
          return;
        }
      }
    }
  }
}

canvas.onmousemove = function (e) {
  if (dragging && selection != null) {
    pos = getMouseXY(e);

    selection.x = (pos.x - PUZZLE_WIDTH) / selection.scaleV - dragoffX;
    selection.y = pos.y / selection.scaleV - dragoffY;

    clearAll();
    
    drawCanvasDrag();

  }
}
function drawCanvas() {
  clearLeft();
  if(showGrid&&blendCounter==11){
      drawGrid();
  }
  displayCompletedPuzzles()
  displayMiniPuzzles();
  if (puzzlesLeft == 0) {
    congratulations();
  }
}
function displayCompletedPuzzles() {
  for (i = 0; i < verticalTiles; i++) {
    for (j = 0; j < horizontalTiles; j++)
      if (completionTable[i][j])
        drawTile(i, j);
  }
}
//update only selection for better efficiency
function drawCanvasDrag() {
  if (contextDragCopy != null && selection != null) {
    context.putImageData(contextDragCopy, 0, 0);
    if (pos.x < PUZZLE_WIDTH) {
      tileX = (pos.x - (pos.x % tileSize)) / tileSize;
      tileY = (pos.y - (pos.y % tileSize)) / tileSize;
      drawTileFrame(tileY, tileX);
    }
    selection.draw();
  }
  else
    console.log("error");
}

canvas.onmouseup = function (e) {
  if (blendCounter == 11) {
    pos = getMouseXY(e);

    if (pos.x < (PUZZLE_WIDTH + dragoffX) && dragging && selection != null) {

      clickedTileX = (pos.x - (pos.x % tileSize)) / tileSize;
      clickedTileY = (pos.y - (pos.y % tileSize)) / tileSize;

      if (clickedTileX == selection.j && clickedTileY == selection.i) {
        drawTile(clickedTileY, clickedTileX);
        completionTable[clickedTileY][clickedTileX] = true;
        selection.kill();
        puzzlesLeft--;
        //console.log("puzzles left: "+ puzzlesLeft);
      }
    }
    if (selection != null) {
      if (pos.x > PUZZLE_WIDTH && pos.x < (WIDTH - tileSize * selection.scaleV) &&
        pos.y > 0 && pos.y < (HEIGHT - tileSize * selection.scaleV)) {
        selection.x = (pos.x - PUZZLE_WIDTH) / selection.scaleV - dragoffX;
        selection.y = pos.y / selection.scaleV - dragoffY;
      }
      else {
        selection.x = startDragX;
        selection.y = startDragY;
      }
    }

    clearAll();

    clearInterval(movingPuzzlesInterval);
    //if speed is 0 then no need to move puzzles
    if ((selection == null || selection != null && selection.speed != 0) && blendCounter == 11)
      movingPuzzlesInterval = setInterval(function () { movingTilesInterval(); }, 90);

    dragging = false;
    selection = null;
    drawCanvas();
  }
}
//
function movingTilesInterval() {
  if (!dragging&&blendCounter==11) {
    clearRight();
    displayMiniPuzzles();
  }
}
function clearRight() {
  context.putImageData(woodImageData, PUZZLE_WIDTH, 0);
  lineTwoPoints(PUZZLE_WIDTH, 0, PUZZLE_WIDTH, HEIGHT, "black");
}
function clearLeft() {
  if (canvasBackgroundData != null)
    context.putImageData(canvasBackgroundData, 0, 0);
    lineTwoPoints(PUZZLE_WIDTH, 0, PUZZLE_WIDTH, HEIGHT, "black");
}
function clearAll() {
  clearLeft();
  clearRight();
}
function clearWhite(){
  context.fillStyle = "white";
  context.fillRect(0,0,WIDTH,HEIGHT);
}

showButton.onclick = function (e) {
  clearInterval(imageBlendInterval);
  showImage();
}
function showImage() {
  clearLeft();
  displayCompletedPuzzles();
  //clearInterval(movingPuzzlesInterval);
  //movingPuzzlesInterval = null;
  blendCounter = 11;
  var beforeBlendData = context.getImageData(0, 0, PUZZLE_WIDTH, HEIGHT);
  imageBlendInterval = setInterval(function () { showImageInterval(beforeBlendData) }, 120);
}
function showImageInterval(beforeBlendData) {

  blendCounter--;
  var k = 0.95;

  var displayedData = imageData;

  for (var i = 0; i < displayedData.data.length; i = i + 4) {
    //rgb
    displayedData.data[i] = Math.round(displayedData.data[i] * k + beforeBlendData.data[i] * (1 - k));
    displayedData.data[i + 1] = Math.round(displayedData.data[i + 1] * k + beforeBlendData.data[i + 1] * (1 - k));
    displayedData.data[i + 2] = Math.round(displayedData.data[i + 2] * k + beforeBlendData.data[i + 2] * (1 - k));

  }

  context.putImageData(displayedData, 0, 0);

  if (blendCounter < 0) {
    clearInterval(imageBlendInterval);
    blendCounter = 11;
    reloadImage();
    context.putImageData(beforeBlendData, 0, 0);

  }
}
