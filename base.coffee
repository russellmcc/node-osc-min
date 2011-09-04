express = require('express')
socketio = require('socket.io')
require("coffee-script")
osc = require('./lib/osc')

server = express.createServer()
server.use express.static(__dirname + "/static")

# Start server
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