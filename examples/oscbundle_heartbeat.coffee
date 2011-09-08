# Same thing as the oscheartbeat example but with oscbundles.

osc = require 'osc'
dgram = require "dgram"

udp = dgram.createSocket "udp4"

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
    
    udp.send buf, 0, buf.length, 41234, "localhost"
    
setInterval sendHeartbeat, 2000