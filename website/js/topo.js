/** GLOBAL VARIABLES / DATA **/
var img = new Image();
var flag = new Image();
var logo = new Image();
logo.src = '../website/img/logo/mp-logo-white.png';        
img.src = topoData.image;
flag.src = topoData.flag;
const scaleRadio = document.getElementsByName("scale"); 
const lineColor = "rgba(204,25,29,0.95)";
const belayColor = "rgb(236,142,140,0.9)";
const decentBelay = "rgba(84, 122, 183, 0.9)";
const decentLine = "rgb(1, 70, 181, 0.95)";
const infoBoxColor = 'rgba(28, 35, 49, 0.95)';
var scale, maxWidth, belaySize, lineWidth, fontsize;
var maxWidth = 'max';
var dashSpace;    
var arrowSize = 20;
var belayScaler = 1;

function updateScale(){
    for (let i = 0; i < scaleRadio.length; i++) {
        if(scaleRadio[i].checked === true){
            maxWidth = scaleRadio[i].value;
        }
    }
    maxWidth !== 'max' && maxWidth < img.width ? scale = maxWidth / img.width : scale = 1;
    topoData.belaySize ? belaySize =  sThis(topoData.belaySize) : belaySize = sThis(24);
    belayScaler = belaySize / 24;
    lineWidth = sThis(6) * belayScaler;
    arrowSize = 20 * belayScaler;
    fontsize = sThis(55) * belayScaler;
    dashSpace = [sThis(32) * belayScaler, sThis(8) * belayScaler, sThis(5) * belayScaler, sThis(8) * belayScaler];
} 

updateScale();


/** Draws the topo on the canvas based on the current data */
function draw() {
    updateScale();
    /** DEFINE THE DERIVED DRAWING VARIABLES */
    let infoBox = document.getElementById('c1').checked; 
    let routeLine = document.getElementById('c2').checked; 
    let belayPoints = document.getElementById('c3').checked; 
    let absailPoints = document.getElementById('c4').checked; 
    let pitchLabels = document.getElementById('c5').checked; 
    var ctx = document.getElementById('canvas').getContext('2d');
    const imgWidth = sThis(img.width);
    const imgHeight = sThis(img.height);
    const flagWidth = sThis(100);
    const flagLeftMargin = sThis(80);
    const flagHeight = flagWidth * (flag.height / flag.width);
    const boxHeight = sThis(100);
    
    canvas.width = imgWidth;
    canvas.height = imgHeight;

    // Adds the main Crag image
    ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

    // Ads the box at the bottom
    if (infoBox === true) {
        ctx.fillStyle = infoBoxColor;
        ctx.rect(0, imgHeight - boxHeight, imgWidth, imgHeight); // ToDo: make sizes relative to image size eg 8% of height
        ctx.fill();
        ctx.drawImage(flag, flagLeftMargin, (imgHeight - boxHeight + ((boxHeight - flagHeight) / 2)), flagWidth, flagHeight);
        ctx.drawImage(logo, (imgWidth - sThis(520)), (imgHeight - sThis(90)), sThis(75), sThis(75));
        ctx.font = sThis(55) + "px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(topoData.title, flagLeftMargin * 2 + flagWidth, imgHeight - sThis(35));
        ctx.fillText('multi-pitch.com', (imgWidth - sThis(420)), imgHeight - sThis(35));
    }

    // Add the Topo Line
    if (routeLine === true) {
        if (topoData.route.length > 1){
            drawLine(ctx, topoData.route, true, false, lineColor);
        }
    }

    
    for (let i = 0; i < topoData.pitches.length; i++) { 
        // Add the Belay Points
        if (belayPoints === true) {
            drawBelay(
                ctx,
                topoData.pitches[i].belayPosition[0], 
                topoData.pitches[i].belayPosition[1], 
                lineColor, belayColor);
        }
        // add the labels
        if (topoData.pitches[i].height !== null && pitchLabels === true) {
            annotate(
                ctx,
                topoData.pitches[i].height,
                sThis(topoData.pitches[i].labelPosition[0]), 
                sThis(topoData.pitches[i].labelPosition[1]), 
                lineColor);
        }
        if (topoData.pitches[i].grade !== null && pitchLabels === true) {
            annotate(
                ctx,
                topoData.pitches[i].grade,
                sThis(topoData.pitches[i].labelPosition[0]), 
                sThis(topoData.pitches[i].labelPosition[1]) + (fontsize * 1.3), 
                lineColor);
        }
    }

    // Add the abasail Points
    if (absailPoints === true) {
        for (let i = 0; i < topoData.decent.length; i++) {
            if(topoData.decent[i].anchor !== null){
                drawBelay(ctx, 
                    topoData.decent[i].anchor[0], 
                    topoData.decent[i].anchor[1], 
                    decentLine, decentBelay);
            }
            if(topoData.decent[i].path !== null){
                drawLine(ctx, topoData.decent[i].path, true, true, decentLine);
            }
            if(topoData.decent[i].label !== null && pitchLabels === true){
                annotate(ctx, topoData.decent[i].label, sThis(topoData.decent[i].labelPosition[0]), 
                    sThis(topoData.decent[i].labelPosition[1]), decentLine);
            }
        }
    }
}

/** A set of helper functions **/
function drawBelay(context, x, y, line, fill){
    if (x > 0 && y > 0){
        context.strokeStyle = line;
        context.setLineDash([]);
        context.lineWidth = lineWidth;
        context.fillStyle = fill;
        context.beginPath();
        context.arc(sThis(x), sThis(y), belaySize, 0, 2 * Math.PI, false);
        context.fill();
        context.stroke();
        context.closePath();
    }
}

function annotate(context, msg, x, y, color){
    context.setLineDash([]); // ensure text is a solid line not dashed 
    context.font = "bold " + (fontsize * 0.8) + "px sans-serif";
    context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    context.lineWidth = sThis(10) * belayScaler;
    context.strokeText(msg, x, y);
    context.fillStyle = color;
    context.fillText(msg, x, y);
}

function drawLine (context, arrayOfxy, dashed, arrowEnd, color){
    context.beginPath();
    context.moveTo(sThis(arrayOfxy[0][0]), sThis(arrayOfxy[0][1]));
        for (var i = 0; i < arrayOfxy.length - 2; i++) {
            context.quadraticCurveTo(sThis(arrayOfxy[i][0]), 
                    sThis(arrayOfxy[i][1]), 
                    sThis((arrayOfxy[i][0] + arrayOfxy[i + 1][0]) / 2), 
                    sThis((arrayOfxy[i][1] + arrayOfxy[i + 1][1]) / 2));
        }
        context.quadraticCurveTo(sThis(arrayOfxy[i][0]), 
                    sThis(arrayOfxy[i][1]), 
                    sThis(arrayOfxy[i + 1][0]), 
                    sThis(arrayOfxy[i + 1][1])); // For the last 2 points
        context.strokeStyle = color;
        context.lineWidth = lineWidth;
        context.lineCap = 'round';
        dashed === true ? context.setLineDash(dashSpace) : context.setLineDash([]);
        context.stroke();
        if (arrowEnd === true) { 
            drawArrowhead(context, arrayOfxy[arrayOfxy.length - 2], arrayOfxy[arrayOfxy.length - 1], arrowSize, color);
        }
}

function drawArrowhead(context, from, to, radius, color) {
    context.beginPath();
    var angle = Math.atan2(to[1] - from[1], to[0] - from[0])
    var x = radius * Math.cos(angle) + to[0];
    var y = radius * Math.sin(angle) + to[1];
    context.moveTo(sThis(x), sThis(y));

    angle += (1.0 / 3.0) * (2 * Math.PI)
    x = radius * Math.cos(angle) + to[0];
    y = radius * Math.sin(angle) + to[1];
    context.lineTo(sThis(x), sThis(y));

    angle += (1.0 / 3.0) * (2 * Math.PI)
    x = radius * Math.cos(angle) + to[0];
    y = radius * Math.sin(angle) + to[1];
    context.lineTo(sThis(x), sThis(y));

    context.closePath();
    context.fillStyle = color;
    context.fill();
}

function sThis(number) {
    return number * scale;
}

img.onload = function () {
    var canvas = document.getElementById('canvas');
    draw();
}