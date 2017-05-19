var util = require('util');
var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
var flag = 1;
 
var C = xbee_api.constants;
 
var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 2
});
 
var serialport = new SerialPort("COM16", {
  baudrate: 115200,
  parser: xbeeAPI.rawParser()
});
 
serialport.on("open", function() {
  // var frame_obj = { // AT Request to be sent to  
  //   // type: C.FRAME_TYPE.AT_COMMAND,
  //   type: 0x00,
  //   id: 0x01,
  //   command: "NI",
  //   commandParameter: [],
  //   options: 0x00, // optional, 0x00 is default 
  //   data: "TxData0A" // Can either be string or byte array. 
  // };
 
  // serialport.write(xbeeAPI.buildFrame(frame_obj));
  tesuto();
});

serialport.on("data", function(data){
  console.log(data);
})
 
// All frames parsed by the XBee will be emitted here 
xbeeAPI.on("frame_object", function(frame) {
  console.log("frame_type : " +frame.type);
  if(frame.type == C.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST){  
    try{
      console.log(frame.data.toString('utf8'));
    }catch(err){
      console.log("frame_object error : " +err);
    }
  }
});

xbeeAPI.on("error", function(error){
  console.log("Xbee error : " +error);
});

function tesuto(){
  setInterval(function(){
    // serialport.write("" +flag);
    // console.log("5 seconds");
    // flag *= -1;
  }, 5000);
}