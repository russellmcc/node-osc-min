require ["cs!req"], (req) ->
  deps =
    app : "text!app.mustache"
    socket_io_pollutes : "socket.io/socket.io"
    m : "mustache"
  req require, deps, ->
    m = @m
    app=@app
    console.log "all requirements!"
    socket = io.connect "http://localhost/ping"
    socket.on("ping", () ->
        console.log "ping"
        socket.emit("pong", "pongtastic")
    )
    socket.on("poke", () ->
        console.log "poke!"
        $("body").append m.to_html app
    )