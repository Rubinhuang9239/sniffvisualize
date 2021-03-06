var spawn = require('child_process').spawn;
var fs = require('fs');
var network = require('network');

var channelIndex = 0;
var channelHopper;
var currentChannel;
var hopTimer;
var tinsSniffer;
var currentInterface;

var hop = function(channels, channelHopInterval) {
  if (channelHopper) {
    channelHopper.kill();
  }

  if (channelIndex < (channels.length-1) ){
    channelIndex ++;
  } else{
    channelIndex = 0;
  }

  currentChannel = channels[channelIndex];

  channelHopper = spawn('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport', ['sniff', currentChannel]);

  channelHopper.stdout.on('data', function (data) {
    console.log('airport stdout: ' + data);
  });

  channelHopper.stderr.on('data', function (data) {
    if(data){
      tinsSniffer.kill();
    }
    console.log('airport stderr: ' + data);
  });

  if(channelHopInterval){
    hopTimer = setTimeout(function(){
      hop(channels, channelHopInterval);
      }, channelHopInterval);
  }
  else{
    hopTimer = setTimeout(function(channels){hop(channels);}, 5000, channels);
  }



};

var clearProcesses = function(cb){
  var killall =spawn('killall', ['tinsSniffer']);

  killall.on('exit',function(){
    var killagain = spawn('killall', ['airport']);
    killagain.on('exit',function(){
      if(typeof cb === "function"){
        cb();
      }
    });
  });
}

var start = function(options){
  clearProcesses(function(){
    options = options || {};
    options.filename = options.hasOwnProperty('filename') ? options.filename : null;
    options.channels = options.hasOwnProperty('channels') ? options.channels : [1,6,11];
    options.interval = options.hasOwnProperty('interval') ? options.interval : 5000;
    options.cb = (typeof options.cb === "function")?options.cb : null;

    if(options.hasOwnProperty('interface')){
      options.interface = options.interface;
    }
    else{
      //Setting a default value
      options.interface = 'en0';
      getWiFiInterfaces(function(obj) {
        if (obj) {
          options.interface = obj[0];
        }
      });
    }
    currentInterface = options.interface;
    console.log("Sniffing on : " +options.interface);

    sniff(options.interface, function(data) {
      if(options.filename){
        fs.appendFile(options.filename, data, function (err) {
          if (err) {
            console.log(err);
          }
        });
      }

      if(options.cb){
        options.cb(data);
      }
    });

    hop(options.channels,options.interval);

  });
};

var sniff = function(interfaceName, callback) {

  tinsSniffer = spawn(require('path').join(__dirname, 'tinsSniffer'), [interfaceName]);
  tinsSniffer.stdout.on('data', function (data) {

    var dataArray = data.toString("utf8").split(",");
    //console.log(typeof(dataArray[6]));
    
    var dataType = dataArray[5]; // Probe Data Beacn
    if(dataType == "Probe") {
        var macAddrData = dataArray[6];
        pushToClient(macAddrData);
    }

    // if (typeof callback === 'function') {
    //   callback(data);
    // } else {
    //   console.log(data);
    // }
  });

  tinsSniffer.stderr.on('data', function (err) {
    if(err){
      channelHopper.kill();
    }
    console.log(err.toString());
    //fs.appendFile('error.log', err.toString());
  });
};

var stop = function() {
  try {
    tinsSniffer.kill();
    channelHopper.kill();

    clearTimeout(hopTimer);
    //For safety
    clearProcesses();
    var wifiOff = spawn('networksetup',['-setairportpower',currentInterface,'off']);
    wifiOff.on('exit',function(){
      console.log("Turning Wi-Fi Off");
      var wifiOn = spawn('networksetup',['-setairportpower',currentInterface,'on']);
      wifiOn.on('exit',function(){console.log("Turned WiFi On")});
    })

  } catch(e) {
    console.log('Error shutting down');
  }
};

var getInterface = function(cb) {
  network.get_active_interface(function(err, obj) {
    cb(obj);
  });
};

var getWiFiInterfaces = function(cb) {
  network.get_interfaces_list(function(err, list) {
    if (err) return cb(err);
    var names = [];

    for(var i=0; i < list.length ; i++){
      if(list[i].desc === "Wi-Fi"){
        names.push(list[i].name);
      }
    }
    cb(names);
  });
};

var getCurrentChannel = function() {
  return currentChannel;
};

module.exports.sniff = sniff;
module.exports.hop = hop;
module.exports.start = start;
module.exports.stop = stop;
module.exports.getInterface = getInterface;
module.exports.getWiFiInterfaces = getWiFiInterfaces;
module.exports.getCurrentChannel = getCurrentChannel;




//----------//

var express = require("express"); 
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

var macAddr = []; 

// setInterval(function(){
//   pushToClient(macAddr);
//   macAddr = [];
// },1000);

app.use(express.static("public"));

app.get("/",function(req,res){
  console.log("hi")
  res.sendfile("public/index.html");
});

http.listen(3000,function(){
  console.log("3000 on");
});

io.on("connection",function(socket){

  socket.emit("msg", "welcome!");

})

var pushToClient = function(msg){
  io.sockets.emit("msg", msg);
}





