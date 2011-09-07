express = require('express')
socketio = require('socket.io')
require("coffee-script")
osc = require('./lib/osc')
binpack = require('binpack')

server = express.createServer()
server.use express.static(__dirname + "/static")

# Start UI server
server.listen 8124
io = socketio.listen server

# Set-up ping listener
ping = io.of("/ping")
ping.on("connection", (socket) ->
    console.log "connected"
    
    socket.on("pong", (message) ->
        console.log message
        socket.emit "poke"
    )
    
    socket.emit "ping"
)

console.log "Server running at http://localhost:8124"

# set up an OSC server
udp = require "dgram"

sock = udp.createSocket "udp4", (msg, rinfo) ->
    parsed = osc.fromBuffer msg
    console.log parsed if parsed?
    
sock.bind 41234

console.log "OSC listener running at http://localhost:41234"