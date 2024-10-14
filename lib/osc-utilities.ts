export type TypedBufferLike = {
  buffer: ArrayBuffer;
  byteOffset: number;
  byteLength: number;
};

export type BufferInput = ArrayBuffer | TypedBufferLike;

const toView = (buffer: BufferInput): DataView => {
  if (buffer instanceof ArrayBuffer) {
    return new DataView(buffer);
  }
  return new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
};

export const toOscString = function (str: string): ArrayBuffer {
  if (!(typeof str === "string")) {
    throw new OSCError("can't pack a non-string into an osc-string");
  }
  if (str.indexOf("\u0000") !== -1) {
    throw new OSCError(
      "Can't pack an osc-string that contains NULL characters"
    );
  }

  const buffer = new TextEncoder().encode(str);
  const padding = 4 - (buffer.length % 4);
  const ret = new ArrayBuffer(buffer.length + padding);
  new Uint8Array(ret).set(buffer);
  return ret;
};

export const splitOscString = function (bufferInput: BufferInput): {
  value: string;
  rest: DataView;
} {
  const buffer = toView(bufferInput);
  const uint8Array = new Uint8Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength
  );

  // First, find the first null character.
  const nullIndex = uint8Array.indexOf(0);
  if (nullIndex === -1) {
    throw new OSCError("All osc-strings must contain a null character");
  }
  const stringPart = uint8Array.slice(0, nullIndex);
  const padding = 4 - (stringPart.length % 4);

  if (uint8Array.length < nullIndex + padding) {
    throw new OSCError(`Not enough padding for osc-string`);
  }
  // Verify padding is all zeros
  for (let i = 0; i < padding; i++) {
    if (uint8Array[stringPart.length + i] !== 0) {
      throw new OSCError("Corrupt padding for osc-string");
    }
  }
  return {
    value: new TextDecoder().decode(stringPart),
    rest: sliceDataView(buffer, nullIndex + padding),
  };
};

export type TimeTag = [number, number];

const sliceDataView = (dataView: DataView, start: number) => {
  return new DataView(
    dataView.buffer,
    dataView.byteOffset + start,
    dataView.byteLength - start
  );
};

export const splitInteger = function (bufferInput: BufferInput): {
  value: number;
  rest: DataView;
} {
  const buffer = toView(bufferInput);
  const bytes = 4;
  if (buffer.byteLength < bytes) {
    throw new OSCError("buffer is not big enough for integer type");
  }
  return {
    value: buffer.getInt32(0, false),
    rest: sliceDataView(buffer, bytes),
  };
};

export const splitTimetag = function (bufferInput: BufferInput): {
  value: TimeTag;
  rest: DataView;
} {
  const buffer = toView(bufferInput);
  const bytes = 4;
  if (buffer.byteLength < bytes * 2) {
    throw new OSCError("buffer is not big enough to contain a timetag");
  }
  const seconds = buffer.getUint32(0, false);
  const fractional = buffer.getUint32(bytes, false);
  return {
    value: [seconds, fractional],
    rest: sliceDataView(buffer, bytes * 2),
  };
};

const UNIX_EPOCH = 2208988800;

const TWO_POW_32 = 4294967296;

export const dateToTimetag = function (date: Date): TimeTag {
  const timeStamp = date.getTime() / 1000;
  const wholeSecs = Math.floor(timeStamp);
  return makeTimetag(wholeSecs, timeStamp - wholeSecs);
};

const makeTimetag = function (
  unixseconds: number,
  fracSeconds: number
): TimeTag {
  var ntpFracs, ntpSecs;
  ntpSecs = unixseconds + UNIX_EPOCH;
  ntpFracs = Math.round(TWO_POW_32 * fracSeconds);
  return [ntpSecs, ntpFracs];
};

export const timetagToDate = function ([seconds, fractional]: TimeTag) {
  const date = new Date();
  date.setTime(
    (seconds - UNIX_EPOCH) * 1000 + (fractional * 1000) / TWO_POW_32
  );
  return date;
};

export const deltaTimetag = function (seconds, now?: Date) {
  return dateToTimetag(
    new Date((now ?? new Date()).getTime() + seconds * 1000)
  );
};

export const toTimetagBuffer = function (timetag: Date | TimeTag): ArrayBuffer {
  if (typeof timetag === "object" && "getTime" in timetag) {
    [timetag[0], timetag[1]] = dateToTimetag(timetag);
  } else if (timetag.length !== 2) {
    throw new OSCError("Invalid timetag" + timetag);
  }
  const ret = new DataView(new ArrayBuffer(8));
  ret.setUint32(0, timetag[0], false);
  ret.setUint32(4, timetag[1], false);
  return ret.buffer;
};

export const toIntegerBuffer = function (number: number): ArrayBuffer {
  const ret = new DataView(new ArrayBuffer(4));
  ret.setInt32(0, number, false);
  return ret.buffer;
};

const parseOscArg = (
  code: string,
  buffer: BufferInput
):
  | {
      value: OscArgOutput;
      rest: DataView;
    }
  | undefined => {
  switch (code) {
    case "s": {
      const { value, rest } = splitOscString(buffer);
      return { value: { type: "string", value }, rest };
    }
    case "i": {
      const { value, rest } = splitInteger(buffer);
      return { value: { type: "integer", value }, rest };
    }
    case "t": {
      const { value, rest } = splitTimetag(buffer);
      return { value: { type: "timetag", value }, rest };
    }
    case "f": {
      const view = toView(buffer);
      return {
        value: { type: "float", value: view.getFloat32(0, false) },
        rest: sliceDataView(view, 4),
      };
    }
    case "d": {
      const view = toView(buffer);
      return {
        value: { type: "double", value: view.getFloat64(0, false) },
        rest: sliceDataView(view, 8),
      };
    }
    case "b": {
      const view = toView(buffer);
      const { value: length, rest: data } = splitInteger(view);
      return {
        value: {
          type: "blob",
          value: new DataView(data.buffer, data.byteOffset, length),
        },
        rest: sliceDataView(data, length),
      };
    }
    case "T":
      return {
        value: { type: "true", value: true },
        rest: toView(buffer),
      };
    case "F":
      return {
        value: { type: "false", value: false },
        rest: toView(buffer),
      };
    case "N":
      return {
        value: { type: "null", value: null },
        rest: toView(buffer),
      };
    case "I":
      return {
        value: { type: "bang", value: "bang" },
        rest: toView(buffer),
      };
  }
  return undefined;
};

const toOscArgument = (arg: OscArgWithType): ArrayBuffer => {
  switch (arg.type) {
    case "string":
      return toOscString(arg.value);
    case "integer":
      return toIntegerBuffer(arg.value);
    case "timetag":
      return toTimetagBuffer(arg.value);
    case "float": {
      const ret = new DataView(new ArrayBuffer(4));
      ret.setFloat32(0, arg.value, false);
      return ret.buffer;
    }
    case "double": {
      const ret = new DataView(new ArrayBuffer(8));
      ret.setFloat64(0, arg.value, false);
      return ret.buffer;
    }
    case "blob": {
      const view = toView(arg.value);
      const ret = new DataView(new ArrayBuffer(4 + arg.value.byteLength));
      ret.setUint32(0, arg.value.byteLength, false);
      new Uint8Array(ret.buffer, ret.byteOffset + 4, ret.byteLength - 4).set(
        new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
      );
      return ret.buffer;
    }
    case "true":
      return new ArrayBuffer(0);
    case "false":
      return new ArrayBuffer(0);
    case "null":
      return new ArrayBuffer(0);
    case "bang":
      return new ArrayBuffer(0);
  }
};

export type OscTypeCode =
  | "s"
  | "i"
  | "t"
  | "f"
  | "d"
  | "b"
  | "T"
  | "F"
  | "N"
  | "I";

const RepresentationToTypeCode: {
  [key in OscArgWithType["type"]]: OscTypeCode;
} = {
  string: "s",
  integer: "i",
  timetag: "t",
  float: "f",
  double: "d",
  blob: "b",
  true: "T",
  false: "F",
  null: "N",
  bang: "I",
};

export type OscArgOutput =
  | {
      type: "string";
      value: string;
    }
  | {
      type: "integer";
      value: number;
    }
  | {
      type: "timetag";
      value: TimeTag;
    }
  | {
      type: "float";
      value: number;
    }
  | {
      type: "double";
      value: number;
    }
  | {
      type: "blob";
      value: DataView;
    }
  | {
      type: "true";
      value: true;
    }
  | {
      type: "false";
      value: false;
    }
  | {
      type: "null";
      value: null;
    }
  | {
      type: "bang";
      value: "bang";
    };

export type OscArgOutputOrArray =
  | OscArgOutput
  | { type: "array"; value: OscArgOutputOrArray[] };

export type OscArgWithType =
  | {
      type: "string";
      value: string;
    }
  | {
      type: "integer";
      value: number;
    }
  | {
      type: "timetag";
      value: TimeTag | Date;
    }
  | {
      type: "float";
      value: number;
    }
  | {
      type: "double";
      value: number;
    }
  | {
      type: "blob";
      value: ArrayBuffer | TypedBufferLike;
    }
  | {
      type: "true";
    }
  | {
      type: "false";
    }
  | {
      type: "null";
    }
  | {
      type: "bang";
    };

export type AcceptedOscArg =
  | OscArgWithType
  | string
  | number
  | Date
  | ArrayBuffer
  | TypedBufferLike
  | true
  | false
  | "bang"
  | null;

export type AcceptedOscArgOrArray =
  | AcceptedOscArg
  | AcceptedOscArgOrArray[]
  | { type: "array"; value: AcceptedOscArgOrArray[] };

const toOscArgWithType = (arg: AcceptedOscArg): OscArgWithType => {
  if (arg === null) {
    return { type: "null" };
  }
  if (typeof arg === "object" && "type" in arg) {
    return arg;
  }
  if (arg === "bang") {
    return { type: "bang" };
  }
  if (typeof arg === "string") {
    return { type: "string", value: arg };
  }
  if (typeof arg === "number") {
    return { type: "float", value: arg };
  }
  if (arg instanceof Date) {
    return { type: "timetag", value: arg };
  }
  if (arg instanceof ArrayBuffer) {
    return { type: "blob", value: arg };
  }
  if (typeof arg === "object" && "buffer" in arg) {
    return { type: "blob", value: arg };
  }
  if (arg === true) {
    return { type: "true" };
  }
  if (arg === false) {
    return { type: "false" };
  }
  arg satisfies never;
  throw new OSCError("Invalid argument: " + arg);
};

export type OscMessageOutput = {
  address: string;
  args: OscArgOutputOrArray[];
  oscType: "message";
};

export const fromOscMessage = function (buffer: BufferInput): OscMessageOutput {
  const { value: address, rest } = splitOscString(buffer);
  buffer = rest;
  if (address[0] !== "/") {
    throw new OSCError("addresses must start with /");
  }
  if (!buffer.byteLength) {
    return {
      address: address,
      args: [],
      oscType: "message",
    };
  }
  const split = splitOscString(buffer);
  const types = split.value;
  buffer = split.rest;
  if (types[0] !== ",") {
    throw new OSCError("Argument lists must begin with ,");
  }
  const args: OscArgOutputOrArray[] = [];
  const arrayStack = [args];
  for (const parsedType of types.slice(1)) {
    if (parsedType === "[") {
      arrayStack.push([]);
      continue;
    }
    if (parsedType === "]") {
      if (arrayStack.length <= 1) {
        throw new OSCError("Mismatched ']' character.");
      } else {
        const built = arrayStack.pop()!;
        arrayStack[arrayStack.length - 1]!.push({
          type: "array",
          value: built,
        });
      }
      continue;
    }
    const parsed = parseOscArg(parsedType, buffer);
    if (parsed === undefined) {
      throw new OSCError("I don't understand the argument code " + parsedType);
    }
    buffer = parsed.rest;
    arrayStack[arrayStack.length - 1]!.push(parsed.value);
  }
  if (arrayStack.length !== 1) {
    throw new OSCError("Mismatched '[' character");
  }
  return {
    address: address,
    args: args,
    oscType: "message",
  };
};

export type OscBundleOutput = {
  timetag: TimeTag;
  elements: OscPacketOutput[];
  oscType: "bundle";
};

export type OscPacketOutput = OscMessageOutput | OscBundleOutput;

export const fromOscBundle = function (buffer: BufferInput): OscBundleOutput {
  const split1 = splitOscString(buffer);
  const bundleTag = split1.value;
  buffer = split1.rest;
  if (bundleTag !== "#bundle") {
    throw new OSCError("osc-bundles must begin with #bundle");
  }
  const split2 = splitTimetag(buffer);
  const timetag = split2.value;
  buffer = split2.rest;
  const convertedElems = mapBundleList(buffer, function (buffer: BufferInput) {
    return fromOscPacket(buffer);
  });
  return {
    timetag: timetag,
    elements: convertedElems,
    oscType: "bundle",
  };
};

export const fromOscPacket = function (buffer: BufferInput): OscPacketOutput {
  if (isOscBundleBuffer(buffer)) {
    return fromOscBundle(buffer);
  } else {
    return fromOscMessage(buffer);
  }
};

const toOscTypeAndArgs = function (args: AcceptedOscArgOrArray[]): {
  type: string;
  args: ArrayBuffer[];
} {
  let osctype = "";
  let oscargs: ArrayBuffer[] = [];
  for (const arg of args) {
    if (
      arg !== null &&
      (Array.isArray(arg) ||
        (typeof arg === "object" && "type" in arg && arg.type === "array"))
    ) {
      const { type, args: newargs } = toOscTypeAndArgs(
        Array.isArray(arg) ? arg : arg.value
      );
      osctype += "[" + type + "]";
      oscargs = oscargs.concat(newargs);
    } else {
      const withType = toOscArgWithType(arg);
      const typeCode = RepresentationToTypeCode[withType.type];
      const buff = toOscArgument(withType);
      osctype += typeCode;
      oscargs.push(buff);
    }
  }
  return { type: osctype, args: oscargs };
};

export const concat = (buffers: BufferInput[]): ArrayBuffer => {
  const totalLength = buffers.reduce(
    (acc, buffer: BufferInput) => acc + buffer.byteLength,
    0
  );
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of buffers) {
    const view = toView(buffer);
    result.set(
      new Uint8Array(view.buffer, view.byteOffset, view.byteLength),
      offset
    );
    offset += view.byteLength;
  }
  return result.buffer;
};

export type AcceptedOscMessage =
  | string
  | { address: string; args?: AcceptedOscArgOrArray[] | AcceptedOscArg };

export const toOscMessage = function (
  message: AcceptedOscMessage
): ArrayBuffer {
  const address = typeof message === "string" ? message : message.address;
  const rawArgs =
    typeof message === "string"
      ? []
      : message.args === undefined
      ? []
      : Array.isArray(message.args)
      ? message.args
      : [message.args];
  const oscaddr = toOscString(address);
  const { type, args } = toOscTypeAndArgs(rawArgs);
  return concat([oscaddr, toOscString("," + type)].concat(args));
};

export type AcceptedOscBundle = {
  timetag: TimeTag | Date;
  elements?: AcceptedOscPacket[] | AcceptedOscPacket;
};

export type AcceptedOscPacket = AcceptedOscBundle | AcceptedOscMessage;

export const toOscBundle = function (bundle: AcceptedOscBundle): ArrayBuffer {
  const elements =
    bundle.elements === undefined
      ? []
      : Array.isArray(bundle.elements)
      ? bundle.elements
      : [bundle.elements];
  const oscBundleTag = toOscString("#bundle");
  const oscTimeTag = toTimetagBuffer(bundle.timetag);
  const oscElems = elements.reduce((acc, x) => {
    const buffer = toOscPacket(x);
    const size = toIntegerBuffer(buffer.byteLength);
    return acc.concat([size, buffer]);
  }, new Array<ArrayBuffer>());
  return concat([oscBundleTag, oscTimeTag, ...oscElems]);
};

export const toOscPacket = function (packet: AcceptedOscPacket) {
  if (typeof packet === "object" && "timetag" in packet) {
    return toOscBundle(packet);
  } else {
    return toOscMessage(packet);
  }
};

export const applyMessageTranformerToBundle = function (transform) {
  return function (buffer: DataView): DataView {
    const splitStart = splitOscString(buffer);
    buffer = splitStart.rest;
    if (splitStart.value !== "#bundle") {
      throw new OSCError("osc-bundles must begin with #bundle");
    }
    const bundleTagBuffer = toOscString(splitStart.value);
    const timetagBuffer = new DataView(buffer.buffer, buffer.byteOffset, 8);
    buffer = sliceDataView(buffer, 8);
    const elems = mapBundleList(buffer, function (buffer) {
      return applyTransform(
        buffer,
        transform,
        applyMessageTranformerToBundle(transform)
      );
    });
    const totalLength =
      bundleTagBuffer.byteLength +
      timetagBuffer.byteLength +
      elems.reduce((acc, elem) => acc + 4 + elem.byteLength, 0);
    const outBuffer = new Uint8Array(totalLength);
    outBuffer.set(new Uint8Array(bundleTagBuffer), 0);
    outBuffer.set(
      new Uint8Array(
        timetagBuffer.buffer,
        timetagBuffer.byteOffset,
        timetagBuffer.byteLength
      ),
      bundleTagBuffer.byteLength
    );
    let copyIndex = bundleTagBuffer.byteLength + timetagBuffer.byteLength;
    for (const elem of elems) {
      outBuffer.set(
        new Uint8Array(toIntegerBuffer(elem.byteLength)),
        copyIndex
      );
      copyIndex += 4;
      outBuffer.set(
        new Uint8Array(elem.buffer, elem.byteOffset, elem.byteLength),
        copyIndex
      );
      copyIndex += elem.byteLength;
    }
    return new DataView(
      outBuffer.buffer,
      outBuffer.byteOffset,
      outBuffer.byteLength
    );
  };
};

export const applyTransform = function (
  buffer: BufferInput,
  mTransform: (buffer: DataView) => DataView,
  bundleTransform?: (buffer: DataView) => DataView
): DataView {
  if (bundleTransform == null) {
    bundleTransform = applyMessageTranformerToBundle(mTransform);
  }
  const view = toView(buffer);
  if (isOscBundleBuffer(view)) {
    return bundleTransform(view);
  } else {
    return mTransform(view);
  }
};

export const addressTransform = function (
  transform: (string: string) => string
) {
  return function (buffer: DataView): DataView {
    const { value, rest } = splitOscString(buffer);
    return new DataView(concat([toOscString(transform(value)), rest]));
  };
};

export const messageTransform = function (
  transform: (message: OscMessageOutput) => OscMessageOutput
) {
  return function (buffer: DataView): DataView {
    return new DataView(toOscMessage(transform(fromOscMessage(buffer))));
  };
};

class OSCError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OSCError";
  }
}

const isOscBundleBuffer = function (buffer: BufferInput) {
  const string = splitOscString(buffer).value;
  return string === "#bundle";
};

const mapBundleList = function <T>(
  buffer: BufferInput,
  func: (buffer: BufferInput) => T
): T[] {
  let view = toView(buffer);
  const results = new Array<T>();
  while (view.byteLength) {
    const { value: size, rest } = splitInteger(view);
    view = rest;
    if (size > view.byteLength) {
      throw new OSCError(
        "Invalid bundle list: size of element is bigger than buffer"
      );
    }
    const subView = new DataView(view.buffer, view.byteOffset, size);
    try {
      // If there's an exception thrown from the map function, just ignore
      // this result.
      results.push(func(subView));
    } catch (_) {}
    view = sliceDataView(view, size);
  }
  return results;
};
