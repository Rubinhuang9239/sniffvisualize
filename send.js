var fs = require('fs');
var readline = require('readline');
var stream = require('stream');

var instream = fs.createReadStream('packets.log');
var outstream = new stream;
var rl = readline.createInterface(instream, outstream);

rl.on('line', function(line) {
  // process line here
  if(line != "") {
    console.log(line)
    // generate json/csv
  }
})

rl.on('close', function() {
  // do something on finish here
});