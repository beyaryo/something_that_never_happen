var util = require('util');
var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
 
var C = xbee_api.constants;
 
var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 1
});
 
var serialport = new SerialPort("COM15", {
  baudrate: 115200,
  parser: xbeeAPI.rawParser()
});
 
serialport.on("open", function() {
  var frame_obj = { // AT Request to be sent to  
    type: C.FRAME_TYPE.AT_COMMAND,
    command: "NI",
    commandParameter: [],
  };
 
  serialport.write(xbeeAPI.buildFrame(frame_obj));
});
 
// All frames parsed by the XBee will be emitted here 
xbeeAPI.on("frame_object", function(frame) {
    console.log(">>", frame);
});

var Gpio = require('onoff').Gpio;
var buzzer = new Gpio(17, 'out');

// buzz(3, 150);

// function buzz(loop, duration){
//     if(loop > 0){
//         buzzer.writeSync(1);
        
//         setTimeout(function(){
//             buzzer.writeSync(0);
//             setTimeout(function(){
//                 buzz(loop-1, duration);
//             }, 100);
//         }, duration);
//     }
// }
 
// var iv = setInterval(function(){
// 	buzzer.writeSync(1);
// }, 500);
 
// // Stop blinking the LED and turn it off after 5 seconds.
// setTimeout(function() {
//     clearInterval(iv); // Stop blinking
//     buzzer.writeSync(0);  // Turn LED off.
//     buzzer.unexport();    // Unexport GPIO and free resources
// }, 5000);