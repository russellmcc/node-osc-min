fs = require 'fs'
#proc = require 'process'
child = require 'child_process'

task 'test', 'run OSC tests (requires development install)', (options) ->
    test = child.spawn 'nodeunit', ['test']
    test.stdout.pipe process.stdout
    test.stderr.pipe process.stderr