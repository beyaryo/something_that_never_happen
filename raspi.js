var tempCache = 0, humCache = 0, coCache = 0, smokeCache = 0, batCache = 0, fuzzyCache = 0;

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

    socket.on('client_join', function(token, room, callback){
        callback(tempCache, humCache, coCache, smokeCache,
            batCache, fuzzyCache);
    });

    socket.on('open_lock', function(lockSerial){
        openLock(lockSerial);
    });

    socket.on('ring_bell', function(){
        ringBell();
    });

    socket.on('disconnect', function(){
        connectedClient--;
        printDash();
        console.log("An android client disconnected !");
        printCountConnectedDevice();
    });
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
socketAsClient.on("open_lock", function(lockSerial){
    openLock(lockSerial);
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
            // Get data from frame
            var value = (frame.data.toString('utf8')).split("#");

            // Split frame to receive sensor value
            tempCache = getValue(value[4]);
            humCache = getValue(value[5]);
            coCache = getValue(value[6]);
            smokeCache = getValue(value[7]);
            batCache = getValue(value[8]);
            fuzzyCache = getValue(value[9]);
            
            console.log("Data received from waspmote.");
            console.log("Temp : " +tempCache);
            console.log("Hum : " +humCache);
            console.log("CO : " +coCache);
            console.log("Smoke : " +smokeCache);
            console.log("Bat : " +batCache);
            console.log("Fuzzy : " +fuzzyCache);
            
            if(parseInt(fuzzyCache) > 40 && parseInt(fuzzyCache) <= 63){
                buzz(3, 300);
            }else if(parseInt(fuzzyCache) > 63){
                buzz(7, 300);
            }

            /**
             * Emit sensor value to server
             */
            socketAsClient.emit("gateway_data", {
                temp: tempCache,
                hum: humCache,
                co: coCache,
                smoke: smokeCache,
                bat: batCache,
                fuzzy: fuzzyCache
            });

            /**
             * Emit sensor value to connected client in same network
             */
            socketAsServer.emit("sensor_value", {
                temp: tempCache,
                hum: humCache,
                co: coCache,
                smoke: smokeCache,
                bat: batCache,
                fuzzy: fuzzyCache
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

function openLock(lockSerial){
    printDash();
    console.log("Open lock : " +lockSerial);
    serialport.write("1#" +lockSerial+ ";");
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
