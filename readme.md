# osc-min
 
 _simple utilities for open sound control in node.js_

 This package provides some node.js utilities for working with 
 [OSC](http://opensoundcontrol.org/), a format for sound and systems control.  
 Here we implement the [OSC 1.0][spec] specification.  

----
## Examples
### A simple OSC redirecter

          sock = udp.createSocket "udp4", (msg, rinfo) ->
              try
                  redirected = osc.applyAddressTransform msg, (address) -> "/redirect" + address
                  sock.send(
                      redirected,
                      0,
                      redirected.length,
                      outport,
                      "localhost"
                  )
              catch error
                  console.log "error redirecting: " + error
          sock.bind inport

### A simple OSC printer

          sock = udp.createSocket "udp4", (msg, rinfo) ->
              try
                  console.log osc.fromBuffer msg
              catch error
                  console.log "invalid OSC packet"
          sock.bind inport
          


 more examples are available in the `examples/` directory.

----
## Exported functions

------
### .fromBuffer(buffer, [strict])
 takes a node.js Buffer of a complete _OSC Packet_ and 
 outputs the corresponding javascript object, or throws if the buffer is ill-formed.

 `strict` is an optional parameter that makes the function fail more often.

----
### .toBuffer(object, [strict])
 takes a _OSC packet_ encoded in javascript as defined above and returns
 a node.js Buffer, or throws if the object is ill-formed.

----
### .toBuffer(address, arguments[], [strict])
 alternative syntax for above.  Assumes this is an _OSC Message_ as defined above, 
 and `arguments` is an array of _OSC Arguments_ or single _OSC Argument_

----
### .applyAddressTransform(buffer, transform)
 takes a callback that takes a string and outputs a string,
 and applies that to the address of the message encoded in the buffer,
 and outputs an encoded buffer.

 If the buffer encodes an _OSC Bundle_, this applies the function to each address 
 in the bundle.

 There's two subtle reasons you'd want to use this function rather than 
 composing `fromBuffer` and `toBuffer`:
   - Future-proofing - if the OSC message uses an argument typecode that
     we don't understand, calling `fromBuffer` will throw.  The only time
     when `applyAddressTranform` might fail is if the address is malformed.
   - Accuracy - javascript represents numbers as 64-bit floats, so some
     OSC types will not be able to be represented accurately.  If accuracy
     is important to you, then, you should never convert the OSC message to 
     javascript

----
### .applyMessageTransform(buffer, transform)
 takes a function that takes and returns a javascript _OSC Message_ representation,
 and applies that to each message encoded in the buffer,
 and outputs a new buffer with the new address.

 If the buffer encodes an osc-bundle, this applies the function to each message 
 in the bundle.

 See notes above for the Address transform for why you might want to use this.
 While this does parse and re-pack the messages, the bundle timetags are left
 in their accurate and prestine state.

----
## Javascript representations of the OSC types.  
 See the [spec][spec] for more information on the OSC types.

 + An _OSC Packet_ is an _OSC Message_ or an _OSC Bundle_.

 + An _OSC Message_:

           {
               oscType : "message"
               address : "/address/pattern/might/have/wildcards"
               arguments : [arg1,arg2]
           }

    Where arguments is an array of _OSC Arguments_.  `oscType` is optional.
    `arguments` can be a single element.

 + An _OSC Argument_ is represented as a javascript object with the following layout:

           {
               type : "string"
               value : "value"
           }

    Where the type is one of the following:

    + `string` - string value
    + `float` - numeric value
    + `integer` - numeric value
    + `blob` - node.js Buffer value


    For messages sent to the `toBuffer` function, `type` is optional.
    If the argument is not an object, it will be interpreted as the closest
    available OSC type.

 + An _OSC Bundle_ is represented as a javascript object with the following layout

           {
               oscType : "bundle"
               timetag : 7
               elements : [element1, element]
           }

   Where the timetag is a javascript-native numeric value of the timetag,
   and elements is an array of either an _OSC Bundle_ or an _OSC Message_
   The `oscType` field is optional, but is always returned by api functions.

 [spec]: [http://opensoundcontrol.org/spec-1_0]

