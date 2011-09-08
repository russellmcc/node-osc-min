# Same thing as the oscheartbeat example but with oscbundles.

osc = require 'osc'
dgram = require "dgram"

udp = dgram.createSocket "udp4"

if process.argv[2]?
    outport = parseInt process.arg[2]
else
    outport = 41234

sendHeartbeat = () ->
    buf = osc.toBuffer(
        timetag : 12345
        elements : [
            {
                address : "/p1"
                arguments : [12]
            }
            {
                address : "/p2"
                arguments : ["string"]
            }
            {
                timetag: 34567
                elements : [
                    {
                        address : "/p3"
                        arguments : [new Buffer "beat"]
                    }
                ]
            }
        ]
    )
    
    udp.send buf, 0, buf.length, outport, "localhost"
    
setInterval sendHeartbeat, 2000

console.log "sending heartbeat messages to http://localhost:" + outport