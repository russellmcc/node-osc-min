#
#  This file contains some lower-level utilities for OSC handling.
#  My guess is client code won't need this.
#
#  See the comments in osc.coffee for more information about the structure of 
# the objects we're dealing with here.
#
binpack = require "binpack"

# this private utility finds the amount of padding for a given string.
padding = (str) ->
    bufflength = Buffer.byteLength(str)
    4 - (bufflength % 4)

# Utility for working with buffers. takes an array of buffers,
# output one buffer with all of the array concatenated
exports.concatenateBuffers = (buffers) ->
    return (new Buffer 0) if not ((typeof buffers) is "object") and (buffers instanceof Array)

    for buffer in buffers
        if not Buffer.isBuffer(buffer)
            return (new Buffer 0)
    
    sumLength = 0
    sumLength += buffer.length for buffer in buffers

    destBuffer = new Buffer(sumLength)

    copyTo = 0
    for buffer in buffers
        buffer.copy destBuffer, copyTo
        copyTo += buffer.length

    destBuffer

#
# An error that only throws when we're in strict mode.
#
StrictError = (str) ->
    new Error "Strict Error: " + str


#
# Convert a javascript string into a node.js Buffer containing an OSC-String.
#
# str must not contain any \u0000 characters.
#
# `strict` is an optional boolean paramter that fails if the string is invalid
# (i.e. contains a \u0000 character)
exports.toOscString = (str, strict) ->
    throw new Error "can't pack a non-string into an osc-string" if not (typeof str == "string")
    
    # strip off any \u0000 characters.
    nullIndex = str.indexOf("\u0000")
    
    # if we're being strict, we can't allow strings with null characters
    throw StrictError "Can't pack an osc-string that contains NULL characters" if (nullIndex != -1 and strict)

    str = str[0...nullIndex] if nullIndex != -1
  
    # osc-strings must have length divisible by 4 and end with at least one zero.
    for i in [0..(padding str)] 
        str += "\u0000"
    
    # create a new buffer from the string.
    new Buffer(str)

#
# Try to split a buffer into a leading osc-string and the rest of the buffer,
# with the following layout:
# { string : "blah" rest : <Buffer>}.
#
# `strict`, as above, is an optional boolean parameter that defaults to false - 
# if it is true, then an invalid buffer will always return null.
#
exports.splitOscString = (buffer, strict) ->
    throw StrictError "Can't split something that isn't a buffer" if not Buffer.isBuffer buffer

    # extract the string
    rawStr = buffer.toString "utf8"
    nullIndex = rawStr.indexOf "\u0000"
    
    # the rest of the code doesn't apply if there's no null character.
    if nullIndex == -1
        throw new Error "All osc-strings must contain a null character" if strict
        return {string:rawStr, rest:(new Buffer 0)}
    
    # extract the string.
    str = rawStr[0...nullIndex]  
    
    # find the length of the string's buffer
    splitPoint = Buffer.byteLength(str) + padding(str)
    
    # in strict mode, don't succeed if there's not enough padding.
    throw StrictError "Not enough padding for osc-string" if strict and splitPoint > buffer.length
    
    # if we're in strict mode, check that all the padding is null
    if strict
        for i in [Buffer.byteLength(str)...splitPoint]
           throw StrictError "Not enough or incorrect padding for osc-string" if buffer[i] != 0
    
    # return a split
    rest = buffer[splitPoint...(buffer.length)]
    
    {string: str, rest: rest}
    
# This has similar semantics to splitOscString but works with integers instead.
# bytes is the number of bytes in the integer, defaults to 4.
exports.splitInteger = (buffer, type) ->
    type = "Int32" if not type?
    bytes = if type is "Int64" or type is "UInt64" or type is "Float64"
                8
            else
                4
    
    throw new Error "buffer is not big enough for integer type" if buffer.length < bytes
    
    num = 0
    
    # integers are stored in big endian format.
    value = binpack["unpack" + type] buffer[0...bytes], "big"
    
    rest = buffer[bytes...(buffer.length)]
    
    return {integer : value, rest : rest}
 
exports.toIntegerBuffer = (number, type) ->
    type = "Int32" if not type?
    return new Error "cannot pack a non-number into an integer buffer" if typeof number isnt "number"
    binpack["pack" + type] number, "big"
    
typeCodes = {
    "i" : "integer"
    "f" : "float"
    "s" : "string"
    "b" : "blob"
}

# convert a type code to a javascript typestring
exports.oscTypeCodeToTypeString = (typeCode) ->
    typeCodes[typeCode]
    
exports.argToTypeCode = (arg) ->
    # if there's an explicit type annotation, back-translate that.
    if arg?.type? and (typeof arg.type is "string")
        for own code, str of typeCodes
            return code if str is arg.type
    
    value = if arg?.value? then arg.value else arg
    
    # now, we try to guess the type.
    throw new Error "Argument has no value" if not value?
    
    # if it's a string, use "s"
    if typeof value is "string"
        return "s"
    
    # if it's a number, use "f" by default.
    if typeof value is "number"
        return "f"
    
    # if it's a buffer, use "b"
    if Buffer.isBuffer(value)
        return "b"

# Splits out an argument from buffer.  Same thing as splitOscString but 
# works for all argument types.
exports.splitOscArgument = (buffer, type, strict) ->
    switch type
        when "string"
            # just pass it through to splitOscString
            split = exports.splitOscString buffer, strict
            {value : split.string, rest : split.rest}
        when "blob"
            # not much to do here, first grab an 4 byte int from the buffer
            split = exports.splitInteger buffer
            {integer : length, rest : buffer} = split
            {value : buffer[0...length], rest : buffer[length...(buffer.length)]}
        when "integer"
            split = exports.splitInteger buffer
            {value : split.integer, rest : split.rest}
        when "float"
            # unpack it.
            {value : (binpack.unpackFloat32 buffer[0...4], "big"), rest : buffer[4...(buffer.length)]}            
        else throw new Error "I don't understand how I'm supposed to unpack " + type
        
# Create a buffer with the given javascript type
exports.toOscArgument = (value, type, strict) ->
    switch type
        when "string"
            throw new Error "expected string" if typeof value isnt "string"
            exports.toOscString value, strict
        when "integer"
            throw new Error "expected number" if typeof value isnt "number"
            exports.toIntegerBuffer value
        when "blob"
            throw new Error "expected blob" if not Buffer.isBuffer value
            size = exports.toIntegerBuffer value.length
            exports.concatenateBuffers [size, value]
        when "float"
            throw new Error "expected number" if typeof value isnt "number"
            binpack.packFloat32 value, "big"
        else
            throw new Error "I don't know how to pack" + type

#
# translates an OSC message into a javascript representation.
#
exports.fromOscMessage = (buffer, strict) ->
    
    split = exports.splitOscString buffer, strict

    # break off the address
    { string : address, rest : buffer} = split
    
    # technically, addresses have to start with "/".
    throw StrictError "addresses must start with /" if strict and address[0] isnt "/"
    
    # if there's no type string, this is technically illegal, but
    # the specification says we should accept this until all
    # implementations that send message without a type string are fixed.
    # this will never happen, so we should accept this, even in
    # strict mode.
    return {address : address, arguments : []} if not buffer.length

    # if there's more data but no type string, we can't parse the arguments.    
    split = exports.splitOscString buffer, strict
    return {address : address, arguments : []}  if not split
    {string : types, rest : buffer} = split
    
    # if the first letter isn't a "," this isn't a valid type so we can't
    # parse the arguments.
    if types[0] isnt ","
        throw StrictError "Argument lists must begin with ," if strict
        return {address : address, arguments : []} 
 
    # we don't need the comma anymore
    types = types[1..(types.length)]
    
    args = []
    # grab each argument.
    for type in types
        # by the standard, we have to ignore the whole message if we don't understand an argument
        typeString = exports.oscTypeCodeToTypeString type
        throw new Error "I don't understand the argument code " + type if not typeString?
        
        arg = exports.splitOscArgument buffer, typeString, strict
        
        # consume the argument from the buffer
        buffer = arg.rest if arg?
        
        # add it to the list.
        args.push(
            type : typeString
            value : arg?.value
        )
 
    {address : address, arguments : args, oscType : "message"}
    
#
# Try to parse an OSC bundle into a javascript object.
#
exports.fromOscBundle = (buffer, strict) ->
    split = exports.splitOscString buffer, strict

    # break off the address
    { string : bundleTag, rest : buffer} = split
    
    # bundles have to start with "#bundle".
    throw new Error "osc-bundles must begin with \#bundle" if bundleTag isnt "\#bundle"
    
    # grab the 8 - bit timetag
    split = exports.splitInteger buffer, "UInt64"

    { integer : timetag, rest : buffer} = split

    # recurse.
    elems = while buffer.length
                    split = exports.splitInteger buffer

                    {integer : size, rest : buffer} = split
                    
                    # if the size is bigger than the packet, something's messed up, so give up.
                    throw new Error "size is bigger than buffer" if size > buffer.length

                    thisElemBuffer = buffer[0...size]
                    
                    # move the buffer to after the element we're just parsing.
                    buffer = buffer[size...buffer.length]
                    
                    # record this element
                    try
                        exports.fromOscMessageOrOscBundle thisElemBuffer, strict
                    catch e
                        null
    
    # remove all null from elements
    nonNullElems = []
    for elem in elems
        (nonNullElems.push elem) if elem?
    
    return {timetag : timetag, elements : nonNullElems, oscType : "bundle"}

#
# convert the buffer into a bundle or a message, depending on the first string
#
exports.fromOscMessageOrOscBundle = (buffer, strict) ->
    # both formats begin with strings, so we should just grab the front but not consume it.
    split = exports.splitOscString buffer, strict
    
    if split.string is "\#bundle"
        exports.fromOscBundle buffer, strict
    else
        exports.fromOscMessage buffer, strict
        
#
# convert a javascript format message into an osc buffer
#
exports.toOscMessage = (message, strict) ->
    # the message must have addresses and arguments.
    throw new Error "message must contain an address" if not message?.address?
    arguments = if message.arguments? then message.arguments else []
    
    oscaddr = exports.toOscString message.address, strict
    osctype = ","
    oscarguments = []
    
    # fill in arguments
    for arg in arguments
        typeCode = exports.argToTypeCode arg
        if typeCode?
            value = if arg?.value? then arg.value else arg
            buff = exports.toOscArgument value, exports.oscTypeCodeToTypeString(typeCode), strict
            if buff?
                oscarguments.push buff
                osctype += typeCode

    # convert the type tag into an oscString.
    osctype = exports.toOscString osctype
    
    # bundle everything together.
    allArgs = exports.concatenateBuffers oscarguments
    exports.concatenateBuffers [oscaddr, osctype, allArgs]

#
# convert a javascript format bundle into an osc buffer
#    
exports.toOscBundle = (bundle, strict) ->
    # the bundle must have timetag and elements.
    throw StrictError "bundles must have timetags." if strict and not bundle?.timetag?
    timetag =  if bundle?.timetag? then bundle.timetag else 0
    elements = if bundle.elements? then bundle.elements else []
    
    oscBundleTag = exports.toOscString "\#bundle"
    oscTimeTag = exports.toIntegerBuffer timetag, "UInt64"
    
    oscElems = []
    for elem in elements
        try
            # try to convert this sub-element into a buffer
            buff = exports.toOscMessageOrOscBundle elem, strict
            
            if buff?
                # okay, pack in the size.
                size = exports.toIntegerBuffer buff.length
                oscElems.push exports.concatenateBuffers [size, buff]
        catch e
            null
            
    allElems = exports.concatenateBuffers oscElems    
    exports.concatenateBuffers [oscBundleTag, oscTimeTag, allElems]
    
# convert a javascript format bundle or message into a buffer
exports.toOscMessageOrOscBundle = (bundleOrMessage, strict) ->
    # first, determine whether or not this is a bundle.
    if bundleOrMessage?.oscType?
        return exports.toOscBundle bundleOrMessage, strict if bundleOrMessage.oscType is "bundle"
        return exports.toOscMessage bundleOrMessage, strict
    
    # bundles have "timetags" and "elements"
    return exports.toOscBundle bundleOrMessage, strict if bundleOrMessage?.timetag? or bundleOrMessage?.elements?
    
    exports.toOscMessage bundleOrMessage, strict