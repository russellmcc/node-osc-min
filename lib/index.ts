import * as utils from "./osc-utilities.js";

export type OscPacketInput = utils.OscPacketInput;
export type OscBundleInput = utils.OscBundleInput;
export type OscMessageInput = utils.OscMessageInput;
export type OscArgInput = utils.OscArgInput;
export type OscArgOrArrayInput = utils.OscArgOrArrayInput;
export type OscPacketOutput = utils.OscPacketOutput;
export type OscBundleOutput = utils.OscBundleOutput;
export type OscMessageOutput = utils.OscMessageOutput;
export type OscArgOutput = utils.OscArgOutput;
export type OscArgOutputOrArray = utils.OscArgOutputOrArray;
export type BufferInput = utils.BufferInput;
export type TimeTag = utils.TimeTag;

/** Takes a `TypedArray`, `DataView`, `ArrayBuffer`, of node.js `Buffer` of a complete _OSC Packet_ and
 *  outputs the javascript representation, or throws if the buffer is ill-formed.
 */
export const fromBuffer = (buffer: BufferInput): OscPacketOutput =>
  utils.fromOscPacket(buffer);

/**
 * Takes a _OSC packet_ javascript representation as defined below and returns
 * a node.js Buffer, or throws if the representation is ill-formed.
 *
 * See "JavaScript representations of the OSC types" below.
 */
export const toBuffer = (object: OscPacketInput): DataView =>
  utils.toOscPacket(object);

/**
 * Takes a callback that takes a string and outputs a string,
 * and applies that to the address of the message encoded in the buffer,
 * and outputs an encoded buffer.
 *
 * If the buffer encodes an _OSC Bundle_, this applies the function to each address
 * in the bundle.
 *
 * There's two subtle reasons you'd want to use this function rather than
 * composing `fromBuffer` and `toBuffer`:
 *   - Future-proofing - if the OSC message uses an argument typecode that
 *     we don't understand, calling `fromBuffer` will throw.  The only time
 *     when `applyAddressTranform` might fail is if the address is malformed.
 *   - Accuracy - javascript represents numbers as 64-bit floats, so some
 *     OSC types will not be able to be represented accurately.  If accuracy
 *     is important to you, then, you should never convert the OSC message to a
 *     javascript representation.
 */
export const applyAddressTransform = (
  buffer: BufferInput,
  transform: (buffer: string) => string
): DataView => utils.applyTransform(buffer, utils.addressTransform(transform));

/**
 * Takes a function that takes and returns a javascript _OSC Message_ representation,
 * and applies that to each message encoded in the buffer,
 * and outputs a new buffer with the new address.
 *
 * If the buffer encodes an osc-bundle, this applies the function to each message
 * in the bundle.
 *
 * See notes above for applyAddressTransform for why you might want to use this.
 */
export const applyMessageTransform = (
  buffer: BufferInput,
  transform: (buffer: OscMessageOutput) => OscMessageOutput
): DataView => utils.applyTransform(buffer, utils.messageTransform(transform));

/**
 * Convert a timetag array to a JavaScript Date object in your local timezone.
 *
 * Received OSC bundles converted with `fromBuffer` will have a timetag array:
 * [secondsSince1970, fractionalSeconds]
 *
 * This utility is useful for logging. Accuracy is reduced to milliseconds.
 */
export const timetagToDate: ([seconds, fractional]: TimeTag) => Date =
  utils.timetagToDate;

/**
 * Convert a JavaScript Date to a NTP timetag array [secondsSince1970, fractionalSeconds].
 *
 * `toBuffer` already accepts Dates for timetags so you might not need this function. If you need to schedule bundles with finer than millisecond accuracy then you could use this to help assemble the NTP array.
 */
export const dateToTimetag: (date: Date) => TimeTag = utils.dateToTimetag;
