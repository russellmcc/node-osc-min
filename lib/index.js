(function() {
  
// ## Intro
//
// This file provides the most common utilities for working with 
// [OSC](http://opensoundcontrol.org/), a format for sound and systems control.  
// Here we implement the OSC 1.0 specification.
//
// There are several types of objects in OSC, each of which corresponds to a javascript object.
// 
// This file primarily contains transformations between packed Buffers of OSC datas and unpacked
// javascript objects.
//
// + An _OSC Packet_ is an _OSC Message_ or an _OSC Bundle_.
//
// + An _OSC Message_ is represented as a javascript object with the following layout:
//
//           {
//               oscType : "message"
//               address : "/address/pattern/might/have/wildcards"
//               arguments : [arg1,arg2]
//           }
//
//    Where arguments is an array of _OSC Arguments_
//
// + An _OSC Argument_ is represented as a javascript object with the following layout:
//
//           {
//               type : "string"
//               value : "value"
//           }
//
//    Where the type is one of the following:
//
//    + "string" - also contains a value key with a string value
//    + "float" - also contains a value key with a node.js Buffer value.
//    + "integer" - also contains an value key with a numeric value
//    + "blob" - also contains a value key with a node.js Buffer value
//
//    For messages send to the `toBuffer` function, the "type" member is optional.
//
//
// + An _OSC Bundle_ is represented as a javascript object with the following layout
//
//           {
//               oscType : "bundle"
//               timetag : 7
//               elements : [element1, element]
//           }
//
//   Where the timetag is a javascript-native numeric value of the timetag,
//   and elements is an array of either an _OSC Bundle_ or an _OSC Message_
//
  
  var utils, coffee;
  coffee = require("coffee-script");
  utils = require("./osc-utilities");
// ## Exported functions

// `fromBuffer` takes a node.js Buffer of a complete OSC Packet and outputs the corresponding
// javascript object, or throws if the buffer is ill-formed.
//
// `strict` is an optional parameter that makes the function fail more often.
  exports.fromBuffer = function(buffer, strict) {
    return utils.fromOscPacket(buffer, strict);
  };
  
// `toBuffer` takes a OSC packet encoded in javascript as defined above and returns
// a node.js Buffer, or throws if the object is ill-formed
  exports.toBuffer = function(object, strict) {
    return utils.toOscPacket(object, strict);
  };
  
// `applyAddressTransformer` takes a function that takes a string and outputs a string,
// and applies that to the address of the message encoded in the buffer,
// and outputs an encoded buffer
//
// If the buffer encodes an osc-bundle, this applies the function to each address 
// in the bundle.
  exports.applyAddressTransformer = function(buffer, transformer) {
    return utils.applyTransformer(buffer, utils.addressTransformer(transformer));
  };
  
// `applyMessageTransformer` takes a function that takes and returns
// a javascript _OSC Message_ representation,
// and applies that to each message encoded in the buffer,
// and outputs a new buffer with the new address.
//
// If the buffer encodes an osc-bundle, this applies the function to each message 
// in the bundle.
  exports.applyMessageTransformer = function(buffer, transformer) {
    return utils.applyTransformer(buffer, utils.messageTransformer(transformer));
  };

}).call(this);
