var util = require('util');
var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
 
var C = xbee_api.constants;
 
var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 2
});
 
var serialport = new SerialPort("COM16", {
  baudrate: 115200,
  parser: xbeeAPI.rawParser()
});
 
serialport.on("open", function() {
  var frame_obj = { // AT Request to be sent to  
    // type: C.FRAME_TYPE.AT_COMMAND,
    type: 0x00,
    id: 0x01,
    command: "NI",
    commandParameter: [],
    options: 0x00, // optional, 0x00 is default 
    data: "TxData0A" // Can either be string or byte array. 
  };
 
  serialport.write(xbeeAPI.buildFrame(frame_obj));
});
 
// All frames parsed by the XBee will be emitted here 
xbeeAPI.on("frame_object", function(frame) {
    console.log(frame.data.toString('utf8'));
});