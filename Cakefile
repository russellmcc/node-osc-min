fs = require 'fs'
child = require 'child_process'

task 'doc', 'create md and html doc files', (options) ->
  child.exec 'coffee -b -c examples/*', ->
    child.exec 'docket lib/* examples/* -m', ->
      child.exec 'docket lib/* examples/* -d doc_html'

task 'browserify', 'build for a browser', (options)->
  fs.mkdir './build', ->
    child.exec './node_modules/browserify/bin/cmd.js ./lib/index.js --standalone osc -o ./build/osc-min.js', ->
      child.exec './node_modules/uglify-js/bin/uglifyjs -o ./build/osc-min.min.js ./build/osc-min.js'
