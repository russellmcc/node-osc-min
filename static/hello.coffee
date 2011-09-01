require ["cs!req"], (req) ->
  deps =
    app : "text!app.mustache"
  req require, deps, ->
    console.log "all requirements!"