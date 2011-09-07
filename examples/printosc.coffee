osc = require 'osc'
udp = require "dgram"

sock = udp.createSocket "udp4", (msg, rinfo) ->
    try
        console.log osc.fromBuffer msg
    catch error
        console.log "invalid OSC packet"
sock.bind 41234

console.log "OSC listener running at http://localhost:41234"