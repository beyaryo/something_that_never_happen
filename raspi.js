/**
 * Init io for socket client
 * Init SerialPort for read or write serial data from xbee
 * Init xbee for using xbee 
 * Init gpio to access pin output input raspi
 */
var ioClient = require("socket.io-client");
var expressServer = require('express');
var ioServer = require('socket.io');
var wifi = require('node-wifi');
var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
var Gpio = require('onoff').Gpio;

wifi.init();

/**
 * Using gpio 17 (pin 11) for buzzer
 */
var buzzer = new Gpio(17, 'out');

/**
 * Connect socket client to server
 * Define gateway's id
 * Init xbee constant
 */
var socketClient = ioClient.connect("https://uho.herokuapp.com");
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
socketClient.on("connect", function(){
    console.log("\n===========================================\n");
    console.log("Gateway connected");
    joinRoom();
});

/**
 * When user open spesific door
 */
socketClient.on("door", function(doorSerial){
    console.log("\n===========================================\n");
    console.log("Open door : " +doorSerial);
    serialport.write("1#" +doorSerial+ ";");
});

/**
 * When serial port open
 */
serialport.on("open", function() {
    /**
     * Do something here
     */
    serialport.write("1#9e0q;");
});

/**
 * When serial port error
 */
serialport.on("error", function(error){
    console.log("Serial port error : " +error);
})

/**
 * All frames parsed by the XBee will be emitted here
 */
xbeeAPI.on("frame_object", function(frame) {
    console.log("\n===========================================\n");
    console.log("frame_type : " +frame.type);
    /**
     * Check frame type
     * if frame type is zigbee transmit request (0x10) then process it
     */
    if(frame.type == C.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST){  
        try{
            /**
             * Get data from frame
             */
            var value = frame.data.toString('utf8').split("#");

            /**
             * Split frame to receive sensor value
             */
            var temp = getValue(value[4]);
            var hum = getValue(value[5]);
            var co = getValue(value[6]);
            var smoke = getValue(value[7]);
            var bat = getValue(value[8]);
            var prob = getValue(value[9]);
            
            console.log("Data received from waspmote.");
            console.log("Temp : " +temp);
            console.log("Hum : " +hum);
            console.log("CO : " +co);
            console.log("Smoke : " +smoke);
            console.log("Bat : " +bat);
            console.log("Fuzzy : " +prob);
            
            if(parseInt(prob) > 40 && parseInt(prob) <= 63){
                buzz(3, 300);
            }else if(parseInt(prob) > 63){
                buzz(7, 300);
            }

            /**
             * Emit sensor value to server
             */
            socketClient.emit("gateway_data", {
                temp: temp,
                hum: hum,
                co: co,
                smoke: smoke,
                bat: bat,
                fuzzy: prob
            });
        }catch(err){
            console.log("frame_object error : " +err);
        }
    }
});

/**
 * Create or join room on server
 * Each gateway has different room depend on gateway id
 */
function joinRoom(){
    socketClient.emit("join_room", id);
    console.log("Gateway join room " +id);
    var ip = (require( 'os' )).networkInterfaces()['wlan0'][0]['address'];
    wifi.getCurrentConnections(function(err, network){
        if(!err){
            console.log(network);
        }
    });
}

function getValue(val){
    return (val.split(":"))[1];
}

function buzz(loop, duration){
    if(loop > 0){
        buzzer.writeSync(1);
        
        setTimeout(function(){
            buzzer.writeSync(0);
            setTimeout(function(){
                buzz(loop-1);
            }, 100);
        }, duration);
    }
}