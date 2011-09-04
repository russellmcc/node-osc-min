#
# This file was used for TDD and as such probably has limited utility as
# actual unit tests.
#

osc = require "../lib/osc-utilities"

# Basic string tests.

testString = (str, expected_len) ->
    str : str
    len : expected_len
    
testData = [
    testString("abc", 4)
    testString("abcd", 8)
    testString("abcde", 8)
    testString("abcdef", 8)
    testString("abcdefg", 8)
]

testStringLength = (str, expected_len, test) ->
    oscstr = osc.stringToOscString(str)
    test.strictEqual(oscstr.length, expected_len)

exports["basic strings length"] = (test) ->
    for data in testData
        testStringLength data.str, data.len, test
    test.done()

testStringRoundTrip = (str, test, strict) ->
    oscstr = osc.stringToOscString(str)
    str2 = osc.oscStringToString(oscstr, strict)
    test.strictEqual(str, str2)
    
exports["basic strings round trip"] = (test) ->
    for data in testData
        testStringRoundTrip data.str, test
    test.done()
    
exports["non strings fail stringToOscString"] = (test) ->
    test.strictEqual(osc.stringToOscString(7), null)
    test.done()
    
exports["strings with null characters don't fail stringToOscString by default"] = (test) ->
    test.notEqual(osc.stringToOscString("\u0000"), null)
    test.done()
    
exports["strings with null characters fail stringToOscString in strict mode"] = (test) ->
    test.strictEqual(osc.stringToOscString("\u0000", true), null)
    test.done()
    
exports["osc buffers with no null characters fail oscStringToString in strict mode"] = (test) ->
    test.strictEqual(osc.oscStringToString(new Buffer("abc"), true), null)
    test.done()

exports["osc buffers with non-null characters after a null character fail oscStringToString in strict mode"] = (test) ->
    test.strictEqual(osc.oscStringToString(new Buffer("abc\u0000abcd"), true), null)
    test.done()

exports["basic strings pass oscStringToString in strict mode"] = (test) ->
    for data in testData
        testStringRoundTrip data.str, test, true
    test.done()

exports["osc buffers with non-four length fail in strict mode"] = (test) ->
    test.strictEqual(osc.oscStringToString(new Buffer("abcd\u0000\u0000"), true), null)
    test.done()
    
exports["splitOscString of an osc-string matches the string"] = (test) ->
    split = osc.splitOscString osc.stringToOscString "testing it"
    test.strictEqual(split?.string, "testing it")
    test.strictEqual(split?.rest?.length, 0)
    test.done()

exports["splitOscString works with an over-allocated buffer"] = (test) ->
    buffer = osc.stringToOscString "testing it"
    overallocated = new Buffer(16)
    buffer.copy(overallocated)
    split = osc.splitOscString overallocated
    test.strictEqual(split?.string, "testing it")
    test.strictEqual(split?.rest?.length, 4)
    test.done()
    
exports["splitOscString works with just a string by default"] = (test) ->
    split = osc.splitOscString (new Buffer "testing it")
    test.strictEqual(split?.string, "testing it")
    test.strictEqual(split?.rest?.length, 0)
    test.done()
    
exports["splitOscString strict fails for just a string"] = (test) ->
    split = osc.splitOscString (new Buffer "testing it"), true
    test.strictEqual split, null
    test.done()

exports["splitOscString strict fails for string with not enough padding"] = (test) ->
    split = osc.splitOscString (new Buffer "testing \u0000\u0000"), true
    test.strictEqual split, null
    test.done()

exports["splitOscString strict succeeds for strings with valid padding"] = (test) ->
    split = osc.splitOscString (new Buffer "testing it\u0000\u0000aaaa"), true
    test.strictEqual(split?.string, "testing it")
    test.strictEqual(split?.rest?.length, 4)
    test.done()

exports["splitOscString strict fails for string with invalid padding"] = (test) ->
    split = osc.splitOscString (new Buffer "testing it\u0000aaaaa"), true
    test.strictEqual split, null
    test.done()
    
exports["splitOscMessage with no type string works"] = (test) ->
    split = osc.translateOscMessage (new Buffer "/stuff")
    test.strictEqual split?.address, "/stuff"
    test.deepEqual split?.arguments, []
    test.done()