/**
 * Init io for socket client
 * Init SerialPort for read or write serial data from xbee
 * Init xbee for using xbee 
 */
var io = require("socket.io-client");
//var util = require('util');
var SerialPort = require('serialport');
var xbee_api = require('xbee-api');

/**
 * Connect socket to server
 * Define gateway's id
 * Init xbee constant
 */
var socket = io.connect("https://myfis.herokuapp.com");
var id = "j98";
var C = xbee_api.constants;

/**
 * Gateway using xbee with api mode 2
 */
var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 2
});

/**
 * Init Xbee dongle, baudrate and parser  
 */
var serialport = new SerialPort("/dev/ttyUSB0", {
  baudrate: 115200,
  parser: xbeeAPI.rawParser()
});

/**
 * When socket connected to server
 */
socket.on("connect", function(){
    console.log("Gateway connected");
    joinRoom();
});

/**
 * When user open spesific door
 */
socket.on("door", function(doorName){
    console.log(doorName);
});

/**
 * When serial port open
 */
serialport.on("open", function() {
    /**
     * Do something here
     */
});

/**
 * All frames parsed by the XBee will be emitted here
 */
xbeeAPI.on("frame_object", function(frame) {
    /**
     * Get data from frame
     */
    var value = frame.data.toString('utf8').split("#");
    console.log(value);

    /**
     * Split frame to receive sensor value
     */
    var temp = getValue(value[4]);
    var hum = getValue(value[5]);
    var co = getValue(value[6]);
    var smoke = getValue(value[7]);
    var bat = getValue(value[8]);

    /**
     * Emit sensor value to server
     */
    socket.emit("gateway_data", {
        temp: temp,
        hum: hum,
        co: co,
        smoke: smoke,
        bat: bat
    });
});

/**
 * Create or join room on server
 * Each gateway has different room depend on gateway id
 */
function joinRoom(){
    socket.emit("join_room", id);
    console.log("Gateway join room " +id);
}

/**
 * Split value to receive spesific data
 */
function getValue(val){
    return (val.split(":"))[1];
}

