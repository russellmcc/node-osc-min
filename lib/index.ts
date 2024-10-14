import * as utils from "./osc-utilities.js";

// ~api~
//## Exported functions
//
//------
//### .fromBuffer(buffer, [strict])
// takes a node.js Buffer of a complete _OSC Packet_ and
// outputs the javascript representation, or throws if the buffer is ill-formed.
export const fromBuffer = function (
  buffer: utils.BufferInput
): utils.OscPacketOutput {
  return utils.fromOscPacket(buffer);
};

//~api~
//----
//### .toBuffer(object)
// takes a _OSC packet_ javascript representation as defined below and returns
// a node.js Buffer, or throws if the representation is ill-formed.
//
// See "JavaScript representations of the OSC types" below.
//
//----
//### .toBuffer(address, args[])
// alternative syntax for above.  Assumes this is an _OSC Message_ as defined below,
// and `args` is an array of _OSC Arguments_ or single _OSC Argument_
export const toBuffer = function (
  object: utils.AcceptedOscPacket
): ArrayBuffer {
  return utils.toOscPacket(object);
};

//~api~
//----
//### .applyAddressTransform(buffer, transform)
// takes a callback that takes a string and outputs a string,
// and applies that to the address of the message encoded in the buffer,
// and outputs an encoded buffer.
//
// If the buffer encodes an _OSC Bundle_, this applies the function to each address
// in the bundle.
//
// There's two subtle reasons you'd want to use this function rather than
// composing `fromBuffer` and `toBuffer`:
//   - Future-proofing - if the OSC message uses an argument typecode that
//     we don't understand, calling `fromBuffer` will throw.  The only time
//     when `applyAddressTranform` might fail is if the address is malformed.
//   - Accuracy - javascript represents numbers as 64-bit floats, so some
//     OSC types will not be able to be represented accurately.  If accuracy
//     is important to you, then, you should never convert the OSC message to a
//     javascript representation.
export const applyAddressTransform = function (
  buffer: utils.BufferInput,
  transform: (buffer: string) => string
): DataView {
  return utils.applyTransform(buffer, utils.addressTransform(transform));
};

//~api~
//----
//### .applyMessageTransform(buffer, transform)
// takes a function that takes and returns a javascript _OSC Message_ representation,
// and applies that to each message encoded in the buffer,
// and outputs a new buffer with the new address.
//
// If the buffer encodes an osc-bundle, this applies the function to each message
// in the bundle.
//
// See notes above for applyAddressTransform for why you might want to use this.
// While this does parse and re-pack the messages, the bundle timetags are left
// in their accurate and prestine state.
export const applyMessageTransform = function (
  buffer: utils.BufferInput,
  transform: (buffer: utils.OscMessageOutput) => utils.OscMessageOutput
): DataView {
  return utils.applyTransform(buffer, utils.messageTransform(transform));
};

//~api~
//----
//### .timetagToDate(ntpTimeTag)
// Convert a timetag array to a JavaScript Date object in your local timezone.
//
// Received OSC bundles converted with `fromBuffer` will have a timetag array:
// [secondsSince1970, fractionalSeconds]
// This utility is useful for logging. Accuracy is reduced to milliseconds.
export const timetagToDate: ([seconds, fractional]: utils.TimeTag) => Date =
  utils.timetagToDate;

//~api~
//----
//### .dateToTimetag(date)
// Convert a JavaScript Date to a NTP timetag array [secondsSince1970, fractionalSeconds].
//
// `toBuffer` already accepts Dates for timetags so you might not need this function. If you need to schedule bundles with finer than millisecond accuracy then you could use this to help assemble the NTP array.
export const dateToTimetag: (date: Date) => utils.TimeTag = utils.dateToTimetag;
