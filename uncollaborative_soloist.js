// helper for resuming browser audio
function touchStarted() {
    getAudioContext().resume();
}

//function enabling midi
function enableMidi(err) { //check if WebMidi.js is enabled
    if (err) {
        console.log("WebMidi could not be enabled.", err);
    } 
    else {
        console.log("WebMidi enabled!");
    }
  
      
    //name input
    console.log("Inputs Ports: ",WebMidi.inputs);
  
    // name output  
    console.log("Output Ports: ");
    for(i = 0; i< WebMidi.outputs.length; i++){
            console.log(i + ": " + WebMidi.outputs[i].name);	
    }  
      
    //Choose an input port
    midiIn = WebMidi.inputs[0];
  
    //listen to all incoming "note on" input events
    midiIn.addListener('midimessage',midiCallback);
}


// callback when recieving midi signal
function midiCallback(signal){
    data = signal.data
    //console.log(data)
    noteOn[data[1]] = data[2] // data 1 -> pitch, data 2->velocity
    midiToSound(osc[data[1]],envelopes[data[1]],data)
}
        


//MAIN BLOCK
var bg_color = [255,255,255];
var multiply_by = 5
// Create a dictionary to store notes on
var noteOn = new Object();
for (i=1;i< 129;i++){
    noteOn[i] = 0;
}
//Filter obj
var myFilter = new p5.LowPass();
myFilter.set(1500,0);

var graphicsArray = []
var textureImage
var frameNumber


// each note has a corresponding osc
var osc = new Object();
for (i=1;i< 129;i++){
    osc[i] = new p5.Oscillator('sin');
    osc[i].disconnect();
    //osc[i].connect(myFilter);
}
var envelopes = new Object()
for (i=1;i< 129;i++){
    envelopes[i] = new p5.Envelope();
}





// Setup function
var canvasWidth = 128*multiply_by;
var harmonyGen;
let reloadButton;
let cnv
let displayImage = 0;
function setup(){
    
    cnv = createCanvas(canvasWidth,canvasWidth);
    WebMidi.enable(enableMidi);
    console.log(WebMidi.outputs);
    harmonyGen = new HarmonyGenorator();

    //GUI
    reloadButton = createButton('Page Reload');
    reloadButton.position(windowWidth/2-30,windowHeight-20);
    reloadButton.mousePressed(pageReload);

    for(let i =1 ; i < 15;i++){
        graphicsArray.push(loadImage('Graphics/'+i.toString()+'.png'))
    }
    textureImage = loadImage('Texture.png')
}

function pageReload(){
    window.location.reload()
}

if (frameNumber%2000 ==0){
    window.location.reload();
    getAudioContext().resume();
}

// Draw function
function getBaseLog(x, y) {
    return log(y) / log(x);
}
function draw(){
    frameNumber =frameCount;
    cnv.position(windowWidth/2-canvasWidth/2,windowHeight/2-canvasWidth/2,"relative")
    background(0,0,0,100);

    
    // line backgroud
    for(let i = 0; i < canvasWidth+1;i+= 1){
        strokeWeight(1)
        var tempColor = noise((i+(frameCount))*0.01)*150;
        stroke(tempColor,50)
        line(0+i,0,0+i,canvasWidth)
    }
    

    // check if the image is time to shown
    if (frameCount%round(random(5,20)) == 0){
        if(random(0,1)<0.1){
            displayImage = graphicsArray[random([0,1,2,3,4,5,6,7,8,9,10,11,12,13])]
        }else{
            displayImage = 0
        }
    }

    if(displayImage != 0){
        console.log(displayImage)
        image(displayImage,0,0)
    }

    // line Reactivity
    var influenceRange = 5*multiply_by
    var alphaVal
    for (let i = 1; i < 129;i++){
        strokeWeight(1)
        if (noteOn[i] != 0){ 
            harmonyGen.adjustWithInterference(i)
            for (let j = -influenceRange; j<=influenceRange;j++){
                alphaVal = pow(((influenceRange-abs(j))),getBaseLog(influenceRange,255))
                stroke(173,13,2,alphaVal)
                line(0,0+(i*multiply_by+j),canvasWidth,0+(i*multiply_by+j))
            }
        }
    }
    
    harmonyGen.show();
    harmonyGen.chooseNote();
    harmonyGen.adjust();
    harmonyGen.checkRange();

    push();
    blendMode(DODGE);
    image(textureImage,0,0)
    
    pop();
}

// start sound function
function midiToSound(oscillator,envelope,data) {
    if(data[2]!=0){
        oscillator.start();
        envelope.setADSR(1,10,10,10);
        envelope.ramp(oscillator,0,1,0);
        oscillator.freq(midiToFreq(data[1]));
    
    }else{
        oscillator.stop();
    }
}


class HarmonyGenorator{
    constructor(){
        let num = round(random(40,60))
        this.notes = [num,num+7,num+14,num+21,num+28]
        this.fixedNote = null
        this.oscillator = [new p5.Oscillator(),new p5.Oscillator(),new p5.Oscillator(),new p5.Oscillator(),new p5.Oscillator()]
        for(let i = 0; i < 5;i++){
            this.oscillator[i].start();
            this.oscillator[i].freq(midiToFreq(this.notes[i]));
        }
    }
    

    //display
    show(){
        var alphaVal
        var influenceRange = 5*multiply_by
        for (let i = 0; i < this.notes.length;i++){
            strokeWeight(1)
            for (let j = -influenceRange; j<=influenceRange;j++){
                alphaVal = pow(((influenceRange-abs(j))),getBaseLog(influenceRange,255))
                stroke(255, 255, 255,alphaVal)
                line(0,0+(this.notes[i]*multiply_by+j),canvasWidth,0+(this.notes[i]*multiply_by+j))
            }
        }

    }


    // choose note to fix
    chooseNote(){
        // choose update
        for(let i = 0;i<5;i++){
            if(random(0,1)<0.005){
                this.fixedNote = i;
                this.notes[i] = this.notes[i] + round(random(-7,7));
                this.oscillator[i].freq(midiToFreq(this.notes[i]))
                return this.fixedNote
            }
        } 
        return null
    }

    // adjust chord
    adjust(){
        if(this.fixedNote == null){return;}
        for(let i = 0;i<5;i++){
            if (i == this.fixedNote){continue}
            if((this.notes[this.fixedNote]-this.notes[i]) == ((this.fixedNote-i)*7)){continue}
            if((this.notes[this.fixedNote]-this.notes[i]) < ((this.fixedNote-i)*7)){
                this.notes[i] -= 0.3
            }else{this.notes[i]+=0.3}
            this.oscillator[i].freq(midiToFreq(this.notes[i]))
        }
    }

    reset(){
        let num = round(random(40,60))
        this.notes = [num,num+7,num+14,num+21,num+28]
        for(let i = 0; i < 5;i++){
            this.oscillator[i].freq(midiToFreq(this.notes[i]));
        }
    }

    checkRange(){
        for(let i = 0; i < 5;i++){
            if(this.notes[i] > 100 || this.notes[i] < 15){this.reset();return;}
        }
    }

    adjustWithInterference(note){
        for(let i = 0; i < 5;i++){
            var destination = note + random([-5,-7,5,7])
            //console.log(abs(round(this.notes[i])-note) != distance)
            if (round(this.notes[i]) != destination){
                this.notes[i] += (-0.5)*(this.notes[i]>destination) + 0.5*(this.notes[i]<destination)
            }
        }
    }




}

