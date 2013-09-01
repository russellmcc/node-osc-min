fs = require 'fs'
child = require 'child_process'

task 'test', 'run tests (requires development install)', (options) ->
  process.env['NODE_PATH'] = './lib/:$NODE_PATH'
  test = child.spawn 'expresso', ['test']
  test.stdout.pipe process.stdout
  test.stderr.pipe process.stderr

task 'coverage', 'run tests with coverage check (requires development install)', (options) ->
  child.exec 'coffee -c lib', ->
    process.env['NODE_PATH'] = './lib/:$NODE_PATH'
    child.exec 'node-jscoverage lib lib-cov', ->
      test = child.spawn 'expresso', ['test']
      test.stdout.pipe process.stdout
      test.stderr.pipe process.stderr
      test.on "exit", () ->
        child.exec "ls lib/*.coffee", (error, output) ->
          output = output.replace /\.coffee/g, ".js"
          child.exec "rm -rf lib-cov " + output

task 'doc', 'create md and html doc files', (options) ->
  child.exec 'coffee -b -c examples/*', ->
    child.exec 'docket lib/* examples/* -m', ->
      child.exec 'docket lib/* examples/* -d doc_html'