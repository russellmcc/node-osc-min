connect = require('connect')

server = connect.createServer()
server.use connect.static(__dirname + "/static")
server.listen 8124
console.log "Server running at http://localhost:8124"