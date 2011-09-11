# This example simply sends a message with several parameter types 
# every two seconds to port 41234

osc = require 'osc-min'
dgram = require "dgram"

udp = dgram.createSocket "udp4"

if process.argv[2]?
    outport = parseInt process.argv[2]
else
    outport = 41234

sendHeartbeat = () ->
    buf = osc.toBuffer(
        address : "/heartbeat"
        arguments : [
            12
            "sttttring"
            new Buffer "beat"
            {type : "integer", value : 7}
        ]
    )
    
    udp.send buf, 0, buf.length, outport, "localhost"
    
setInterval sendHeartbeat, 2000

console.log "sending heartbeat messages to http://localhost:" + outport