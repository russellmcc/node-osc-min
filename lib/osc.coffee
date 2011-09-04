#
# ## Intro
#
# This file provides utilities for working with [OSC](http://opensoundcontrol.org/), a format for 
# sound and systems control.  Here we implement the OSC 1.1 specification.
#
# There are several types of objects in OSC, each of which corresponds to a javascript object.
# 
# This file primarily contains transformations between packed Buffers of OSC datas and unpacked
# javascript objects.
#
# + An _OSC Packet_ is an _OSC Message_ or an _OSC Bundle_.
#
# + An _OSC Message_ is represented as a javascript object with the following layout:
#
#           {
#               address : "/address/pattern/might/have/*/wildcards"
#               arguments : [arg1,arg2]
#           }
#
#    Where arguments is an array of _OSC Arguments_
#
# + An _OSC Argument_ is represented as a javascript object with the following layout:
#
#           {
#               type : "string"
#               string : "value"
#           }
#
#    Where the type is one of the following:
#
#    + "string" - also contains a "string" key with a string value
#    + "float" - also contains a "float" key with a numeric value
#    + "integer" - also contains an "integer" key with a numeric value
#    + "blob" - also contains a "blob" key with a node.js Buffer value
#
#    For messages send to the `toBuffer` function, the "type" member is optional so long as only
#    one of the other keys is set.
#
#
# + An _OSC Bundle_ is represented as a javascript object with thw following layout
#
#           {
#               timetag : 7
#               timetag_blob : <Buffer>
#               messages : [message1, message 2]
#           }
#
#   Where the timetag is a javascript-native numeric value, and `timetag_blob` is a node.js buffer
#   containing the original, full-resolution timetag.  In bundles sent to `toBuffer`, you only 
#   need to provide one of the two, and the code will use `timetag_blob` if both exist.
#

utils = require "./osc-utilities"

# ## Public Exports

#
# This function takes a node.js Buffer of a complete OSC Packet and outputs the corresponding
# javascript object, or "null" if the buffer is ill-formed.
#
exports.fromBuffer = (buffer) -> 
    
#
# This function takes a OSC packet encoded in javascript as defined above and returns
# a node.js Buffer, or null if the object is ill-formed
#
exports.toBuffer = (packet) ->