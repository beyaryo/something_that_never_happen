/**==========================================================================================================*/
/**============================================= As Server Side =============================================*/
/**==========================================================================================================*/
var expressAsServer = require('express');
var ioAsServer = require('socket.io');
var parser = require('body-parser');
var appAsServer = expressAsServer();

var connectedClient = 0;

appAsServer.set('port', (process.env.PORT || 46195));       // set port to run into
appAsServer.use(expressAsServer.static(__dirname + '/public'));     // app root dir
appAsServer.use(parser.json());                             // support json encoded body
appAsServer.use(parser.urlencoded({extended : true}));      // support encoded body

var socketAsServer = ioAsServer.listen(appAsServer.listen(appAsServer.get('port'), function(){
    printDash();
    console.log("Gateway server running on port " +appAsServer.get('port'));
}));

socketAsServer.on('connection', function(socket){
    connectedClient++;
    printDash();
    console.log("An android client connected !");
    printCountConnectedDevice();
    handleSocketAsServer(socket);
});

function handleSocketAsServer(socket){
    socket.on('buzz', function(){
        ringBell();
    });

    socket.on('disconnect', function(){
        connectedClient--;
        printDash();
        console.log("An android client disconnected !");
        printCountConnectedDevice();
    });

    socket.on('open_door', function(doorSerial){
        openDoor(doorSerial);
    });

    socket.on('ring_bell', function(){
        ringBell();
    })
}

function printCountConnectedDevice(){
    console.log("Total connected device : " +connectedClient);
}

/**==========================================================================================================*/
/**=========================================== End of Server Side ===========================================*/
/**==========================================================================================================*/

/**==========================================================================================================*/
/**============================================= As Client Side =============================================*/
/**==========================================================================================================*/
/**
 * Init io socket for client
 * Init gpio to access pin output input raspi
 */
var ioAsClient = require("socket.io-client");
var wifi = require('node-wifi');
var Gpio = require('onoff').Gpio;

wifi.init();

/**
 * Using gpio 17 (pin 11) for buzzer
 */
var buzzer = new Gpio(17, 'out');

/**
 * Connect socket client to server
 * Define gateway's id
 */
var socketAsClient = ioAsClient.connect("https://uho.herokuapp.com");
var id = "j98";

/**
 * When socket connected to server
 */
socketAsClient.on("connect", function(){
    printDash();
    console.log("Gateway connected");
    joinRoom();
});

/**
 * When socket disconnected from server
 */
socketAsClient.on("disconnect", function(){
    printDash();
    console.log("Gateway disconnected");
})

/**
 * When user open spesific door
 */
socketAsClient.on("open_door", function(doorSerial){
    openDoor(doorSerial);
});

socketAsClient.on('ring_bell', function(){
    ringBell();
})

/**
 * Create or join room on server
 * Each gateway has different room depend on gateway id
 */
function joinRoom(){
    var ip = (require( 'os' )).networkInterfaces()['wlan0'][0]['address'];
    wifi.getCurrentConnections(function(err, network){
        if(!err){
            console.log("Gateway join room " +id);
            socketAsClient.emit("gateway_join", id, ip, network[0].mac);
        }
    });
}
/**==========================================================================================================*/
/**=========================================== End of Client Side ===========================================*/
/**==========================================================================================================*/

/**==========================================================================================================*/
/**============================================= As Coordinator =============================================*/
/**==========================================================================================================*/

/**
 * Init SerialPort for read or write serial data from xbee
 * Init xbee for using xbee 
 */
var SerialPort = require('serialport');
var xbee_api = require('xbee-api');

/**
 * Init xbee constant
 */
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
 * When serial port open
 */
serialport.on("open", function() {
    serialport.write("1#ed01;");
});

/**
 * When serial port error
 */
serialport.on("error", function(error){
    printDash();
    console.log("Serial port error : " +error);
})

/**
 * All frames parsed by the XBee will be emitted here
 */
xbeeAPI.on("frame_object", function(frame) {
    printDash();
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
            var value = (frame.data.toString('utf8')).split("#");

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
            socketAsClient.emit("gateway_data", {
                temp: temp,
                hum: hum,
                co: co,
                smoke: smoke,
                bat: bat,
                fuzzy: prob
            });

            /**
             * Emit sensor value to connected client in same network
             */
            socketAsServer.emit("gateway_data", {
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

function getValue(val){
    return (val.split(":"))[1];
}
/**==========================================================================================================*/
/**=========================================== End of Coordinator ===========================================*/
/**==========================================================================================================*/

/**==========================================================================================================*/
/**============================================== Global Usage ==============================================*/
/**==========================================================================================================*/
function printDash(){
    console.log("\n===========================================\n");
}

function openDoor(doorSerial){
    printDash();
    console.log("Open door : " +doorSerial);
    serialport.write("1#" +doorSerial+ ";");
}

function ringBell(){
    printDash();
    console.log("Bell ring")
    buzz(1, 800);
}

function buzz(loop, duration){
    if(loop > 0){
        buzzer.writeSync(1);
        
        setTimeout(function(){
            buzzer.writeSync(0);
            setTimeout(function(){
                buzz(loop-1, duration);
            }, 100);
        }, duration);
    }
}

// buzz(2, 500);
/**==========================================================================================================*/
/**========================================== End of Global Usage ===========================================*/
/**==========================================================================================================*/
