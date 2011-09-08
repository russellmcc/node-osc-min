fs = require 'fs'
child = require 'child_process'

task 'test', 'run OSC tests (requires development install)', (options) ->
    test = child.spawn 'expresso', ['-I', 'lib', 'test']
    test.stdout.pipe process.stdout
    test.stderr.pipe process.stderr