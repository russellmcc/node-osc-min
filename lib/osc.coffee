#
# ## Intro
#
# This file provides the most common utilities for working with 
# [OSC](http://opensoundcontrol.org/), a format for sound and systems control.  
# Here we implement the OSC 1.0 specification.
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
#               oscType : "message"
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
#               value : "value"
#           }
#
#    Where the type is one of the following:
#
#    + "string" - also contains a value key with a string value
#    + "float" - also contains a value key with a node.js Buffer value.
#    + "integer" - also contains an value key with a numeric value
#    + "blob" - also contains a value key with a node.js Buffer value
#
#    For messages send to the `toBuffer` function, the "type" member is optional.
#
#
# + An _OSC Bundle_ is represented as a javascript object with the following layout
#
#           {
#               oscType : "bundle"
#               timetag : 7
#               elements : [element1, element]
#           }
#
#   Where the timetag is a javascript-native numeric value of the timetag,
#   and elements is an array of either an _OSC Bundle_ or an _OSC Message_
#
# For both _OSC Bundle_s and _OSC Messages

utils = require "./osc-utilities"

# ## Public Exports

exports= 

#
# This takes a node.js Buffer of a complete OSC Packet and outputs the corresponding
# javascript object, or throws if the buffer is ill-formed.
#
# `strict` is an optional parameter that makes the function fail more often.
#
    fromBuffer : (buffer, strict) ->
        utils.fromOscMessageOrOscBundle buffer, strict
    
#
# This takes a OSC packet encoded in javascript as defined above and returns
# a node.js Buffer, or throws if the object is ill-formed
#
    toBuffer : (object, strict) ->
        utils.toOscMessageOrOscBundle object, strict
        
#
# This takes a function that takes a string and outputs a string,
# and applies that to the address of the message encoded in the buffer,
# and outputs a new buffer with the new address.
#
# If the buffer encodes an osc-bundle, this applies the function to each address 
# in the bundle.
#
    applyAddressTransformer : (buffer, transformer) ->
        utils.applyMessageTransformer buffer, (utils.addressTransformer transformer)