fs = require 'fs'
child = require 'child_process'

task 'test', 'run OSC tests (requires development install)', (options) ->
    test = child.spawn 'expresso', ['-I', 'lib', 'test']
    test.stdout.pipe process.stdout
    test.stderr.pipe process.stderr

task 'test-cov', 'run OSC tests with coverage check (requires development install)', (options) ->
    compile = child.exec 'coffee -c lib', ->
      test = child.spawn 'expresso', ['-I', 'lib', '--cov', 'test']
      test.stdout.pipe process.stdout
      test.stderr.pipe process.stderr
      test.on "exit", () ->
        child.exec "rm -rf lib-cov `ls lib/*.coffee | sed -e 's/.coffee/.js/'`"
