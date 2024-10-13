var IsArray,
  TWO_POW_32,
  getArrayArg,
  isOscBundleBuffer,
  mapBundleList,
  toOscTypeAndArgs;

export const toOscString = function (str: string): DataView {
  if (!(typeof str === "string")) {
    throw new Error("can't pack a non-string into an osc-string");
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
  return new DataView(ret);
};

export const splitOscString = function (buffer: DataView): {
  value: string;
  rest: DataView;
} {
  const uint8Array = new Uint8Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength
  );

  // First, find the first null character.
  const nullIndex = uint8Array.indexOf(0);
  if (nullIndex === -1) {
    throw new Error("All osc-strings must contain a null character");
  }
  const stringPart = uint8Array.slice(0, nullIndex);
  const padding = 4 - (stringPart.length % 4);

  if (uint8Array.length < nullIndex + 1 + padding) {
    throw new Error("Note enough padding for osc-string");
  }
  // Verify padding is all zeros
  for (let i = 0; i < padding; i++) {
    if (uint8Array[stringPart.length + i] !== 0) {
      throw new Error("Corrupt padding for osc-string");
    }
  }
  return {
    value: new TextDecoder().decode(stringPart),
    rest: sliceDataView(buffer, nullIndex + 1 + padding),
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

export const splitInteger = function (buffer: DataView): {
  value: number;
  rest: DataView;
} {
  const bytes = 4;
  if (buffer.byteLength < bytes) {
    throw new Error("buffer is not big enough for integer type");
  }
  return {
    value: buffer.getInt32(0, false),
    rest: sliceDataView(buffer, bytes),
  };
};

export const splitTimetag = function (buffer: DataView): {
  value: TimeTag;
  rest: DataView;
} {
  const bytes = 4;
  if (buffer.byteLength < bytes * 2) {
    throw new Error("buffer is not big enough to contain a timetag");
  }
  const seconds = buffer.getUint32(0, false);
  const fractional = buffer.getUint32(bytes, false);
  return {
    value: [seconds, fractional],
    rest: sliceDataView(buffer, bytes * 2),
  };
};

const UNIX_EPOCH = 2208988800;

TWO_POW_32 = 4294967296;

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
    throw new Error("Invalid timetag" + timetag);
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

const oscTypeCodes = {
  s: {
    representation: "string",
    split: splitOscString,
    toArg: toOscString,
  },
  i: {
    representation: "integer",
    split: splitInteger,
    toArg: toIntegerBuffer,
  },
  t: {
    representation: "timetag",
    split: splitTimetag,
    toArg: toTimetagBuffer,
  },
  f: {
    representation: "float",
    split: function (buffer: DataView) {
      return {
        value: buffer.getFloat32(0, false),
        rest: sliceDataView(buffer, 4),
      };
    },
    toArg: function (value: number) {
      const ret = new DataView(new ArrayBuffer(4));
      ret.setFloat32(0, value, false);
      return ret.buffer;
    },
  },
  d: {
    representation: "double",
    split: function (buffer) {
      return {
        value: new DataView(buffer).getFloat64(0, false),
        rest: buffer.slice(8, buffer.length),
      };
    },
    toArg: function (value) {
      const ret = new DataView(new ArrayBuffer(8));
      ret.setFloat64(0, value, false);
      return ret.buffer;
    },
  },
  b: {
    representation: "blob",
    split: function (buffer: DataView) {
      const { value: length, rest: data } = splitInteger(buffer);
      return {
        value: new DataView(data.buffer, data.byteOffset, length),
        rest: sliceDataView(data, length),
      };
    },
    toArg: function (value: DataView) {
      const buffer = new DataView(new ArrayBuffer(4 + value.byteLength));
      buffer.setUint32(0, value.byteLength, false);
      new Uint8Array(
        buffer.buffer,
        buffer.byteOffset + 4,
        buffer.byteLength - 4
      ).set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
      return buffer.buffer;
    },
  },
  T: {
    representation: "true",
    split: function (buffer: DataView) {
      return {
        rest: buffer,
        value: true,
      };
    },
    toArg: function (value: true) {
      return new ArrayBuffer(0);
    },
  },
  F: {
    representation: "false",
    split: function (buffer: DataView) {
      return {
        rest: buffer,
        value: false,
      };
    },
    toArg: function (value: false) {
      return new ArrayBuffer(0);
    },
  },
  N: {
    representation: "null",
    split: function (buffer: DataView) {
      return {
        rest: buffer,
        value: null,
      };
    },
    toArg: function (value: null) {
      return new ArrayBuffer(0);
    },
  },
  I: {
    representation: "bang",
    split: function (buffer: DataView) {
      return {
        rest: buffer,
        value: "bang",
      };
    },
    toArg: function (value: "bang") {
      return new ArrayBuffer(0);
    },
  },
};

export type OscTypeCode = keyof typeof oscTypeCodes;

export type Representation =
  (typeof oscTypeCodes)[keyof typeof oscTypeCodes]["representation"];

export const oscTypeCodeToTypeString = function (
  code: string
): (typeof oscTypeCodes)[keyof typeof oscTypeCodes]["representation"] | null {
  return oscTypeCodes[code]?.representation ?? null;
};

export const typeStringToOscTypeCode = function (
  rep: Representation
): OscTypeCode | null {
  let code: OscTypeCode;
  for (code in oscTypeCodes) {
    const str = oscTypeCodes[code].representation;
    if (str === rep) {
      return code;
    }
  }
  return null;
};

export const argToTypeCode = function (arg) {
  var code, value;
  if (
    (arg != null ? arg.type : void 0) != null &&
    typeof arg.type === "string" &&
    (code = typeStringToOscTypeCode(arg.type)) != null
  ) {
    return code;
  }
  value = (arg != null ? arg.value : void 0) != null ? arg.value : arg;
  if (value == null) {
    throw new Error("Argument has no value");
  }
  if (typeof value === "string") {
    return "s";
  }
  if (typeof value === "number") {
    return "f";
  }
  if (Buffer.isBuffer(value)) {
    return "b";
  }
  if (typeof value === "boolean") {
    if (value) {
      return "T";
    } else {
      return "F";
    }
  }
  if (value === null) {
    return "N";
  }
  throw new Error("I don't know what type this is supposed to be.");
};

export const splitOscArgument = function (buffer, type) {
  var osctype;
  osctype = typeStringToOscTypeCode(type);
  if (osctype != null) {
    return oscTypeCodes[osctype].split(buffer);
  } else {
    throw new Error("I don't understand how I'm supposed to unpack " + type);
  }
};

export const toOscArgument = function (value, type) {
  var osctype;
  osctype = typeStringToOscTypeCode(type);
  if (osctype != null) {
    return oscTypeCodes[osctype].toArg(value);
  } else {
    throw new Error("I don't know how to pack " + type);
  }
};

export const fromOscMessage = function (buffer) {
  var address,
    arg,
    args,
    arrayStack,
    built,
    j,
    len,
    ref,
    ref1,
    type,
    typeString,
    types;
  (ref = splitOscString(buffer)), (address = ref.string), (buffer = ref.rest);
  if (address[0] !== "/") {
    throw new OSCError("addresses must start with /");
  }
  if (!buffer.length) {
    return {
      address: address,
      args: [],
    };
  }
  (ref1 = splitOscString(buffer)), (types = ref1.string), (buffer = ref1.rest);
  if (types[0] !== ",") {
    throw new OSCError("Argument lists must begin with ,");
  }
  types = types.slice(1, +types.length + 1 || 9e9);
  args = [];
  arrayStack = [args];
  for (j = 0, len = types.length; j < len; j++) {
    type = types[j];
    if (type === "[") {
      arrayStack.push([]);
      continue;
    }
    if (type === "]") {
      if (arrayStack.length <= 1) {
        throw new OSCError("Mismatched ']' character.");
      } else {
        built = arrayStack.pop();
        arrayStack[arrayStack.length - 1].push({
          type: "array",
          value: built,
        });
      }
      continue;
    }
    typeString = oscTypeCodeToTypeString(type);
    if (typeString == null) {
      throw new Error("I don't understand the argument code " + type);
    }
    arg = splitOscArgument(buffer, typeString);
    if (arg != null) {
      buffer = arg.rest;
    }
    arrayStack[arrayStack.length - 1].push({
      type: typeString,
      value: arg != null ? arg.value : void 0,
    });
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

export const fromOscBundle = function (buffer) {
  var bundleTag, convertedElems, ref, ref1, timetag;
  (ref = splitOscString(buffer)), (bundleTag = ref.string), (buffer = ref.rest);
  if (bundleTag !== "#bundle") {
    throw new Error("osc-bundles must begin with #bundle");
  }
  (ref1 = splitTimetag(buffer)), (timetag = ref1.timetag), (buffer = ref1.rest);
  convertedElems = mapBundleList(buffer, function (buffer) {
    return fromOscPacket(buffer);
  });
  return {
    timetag: timetag,
    elements: convertedElems,
    oscType: "bundle",
  };
};

export const fromOscPacket = function (buffer) {
  if (isOscBundleBuffer(buffer)) {
    return fromOscBundle(buffer);
  } else {
    return fromOscMessage(buffer);
  }
};

getArrayArg = function (arg) {
  if (IsArray(arg)) {
    return arg;
  } else if (
    (arg != null ? arg.type : void 0) === "array" &&
    IsArray(arg != null ? arg.value : void 0)
  ) {
    return arg.value;
  } else if (arg != null && arg.type == null && IsArray(arg.value)) {
    return arg.value;
  } else {
    return null;
  }
};

toOscTypeAndArgs = function (argList) {
  var arg,
    buff,
    j,
    len,
    oscargs,
    osctype,
    ref,
    thisArgs,
    thisType,
    typeCode,
    value;
  osctype = "";
  oscargs = [];
  for (j = 0, len = argList.length; j < len; j++) {
    arg = argList[j];
    if (getArrayArg(arg) != null) {
      (ref = toOscTypeAndArgs(getArrayArg(arg))),
        (thisType = ref[0]),
        (thisArgs = ref[1]);
      osctype += "[" + thisType + "]";
      oscargs = oscargs.concat(thisArgs);
      continue;
    }
    typeCode = argToTypeCode(arg);
    if (typeCode != null) {
      value = arg != null ? arg.value : void 0;
      if (value === void 0) {
        value = arg;
      }
      buff = toOscArgument(value, oscTypeCodeToTypeString(typeCode));
      if (buff != null) {
        oscargs.push(buff);
        osctype += typeCode;
      }
    }
  }
  return [osctype, oscargs];
};

export const toOscMessage = function (message) {
  var address, allArgs, args, old_arg, oscaddr, oscargs, osctype, ref;
  address =
    (message != null ? message.address : void 0) != null
      ? message.address
      : message;
  if (typeof address !== "string") {
    throw new Error("message must contain an address");
  }
  args = message != null ? message.args : void 0;
  if (args === void 0) {
    args = [];
  }
  if (!IsArray(args)) {
    old_arg = args;
    args = [];
    args[0] = old_arg;
  }
  oscaddr = toOscString(address);
  (ref = toOscTypeAndArgs(args)), (osctype = ref[0]), (oscargs = ref[1]);
  osctype = "," + osctype;
  allArgs = concat(oscargs);
  osctype = toOscString(osctype);
  return concat([oscaddr, osctype, allArgs]);
};

export const toOscBundle = function (bundle) {
  var allElems,
    buff,
    e,
    elem,
    elements,
    elemstr,
    j,
    len,
    oscBundleTag,
    oscElems,
    oscTimeTag,
    ref,
    ref1,
    size,
    timetag;
  if ((bundle != null ? bundle.timetag : void 0) == null) {
    throw new OSCError("bundles must have timetags.");
  }
  timetag =
    (ref = bundle != null ? bundle.timetag : void 0) != null ? ref : new Date();
  elements =
    (ref1 = bundle != null ? bundle.elements : void 0) != null ? ref1 : [];
  if (!IsArray(elements)) {
    elemstr = elements;
    elements = [];
    elements.push(elemstr);
  }
  oscBundleTag = toOscString("#bundle");
  oscTimeTag = toTimetagBuffer(timetag);
  oscElems = [];
  for (j = 0, len = elements.length; j < len; j++) {
    elem = elements[j];
    try {
      buff = toOscPacket(elem);
      size = toIntegerBuffer(buff.length);
      oscElems.push(concat([size, buff]));
    } catch (error) {
      e = error;
      null;
    }
  }
  allElems = concat(oscElems);
  return concat([oscBundleTag, oscTimeTag, allElems]);
};

export const toOscPacket = function (bundleOrMessage) {
  if ((bundleOrMessage != null ? bundleOrMessage.oscType : void 0) != null) {
    if (bundleOrMessage.oscType === "bundle") {
      return toOscBundle(bundleOrMessage);
    }
    return toOscMessage(bundleOrMessage);
  }
  if (
    (bundleOrMessage != null ? bundleOrMessage.timetag : void 0) != null ||
    (bundleOrMessage != null ? bundleOrMessage.elements : void 0) != null
  ) {
    return toOscBundle(bundleOrMessage);
  }
  return toOscMessage(bundleOrMessage);
};

export const applyMessageTranformerToBundle = function (transform) {
  return function (buffer) {
    var bundleTagBuffer,
      copyIndex,
      elem,
      elems,
      j,
      k,
      len,
      len1,
      lengthBuff,
      outBuffer,
      ref,
      string,
      timetagBuffer,
      totalLength;
    (ref = splitOscString(buffer)), (string = ref.string), (buffer = ref.rest);
    if (string !== "#bundle") {
      throw new Error("osc-bundles must begin with #bundle");
    }
    bundleTagBuffer = toOscString(string);
    timetagBuffer = buffer.slice(0, 8);
    buffer = buffer.slice(8, buffer.length);
    elems = mapBundleList(buffer, function (buffer) {
      return applyTransform(
        buffer,
        transform,
        applyMessageTranformerToBundle(transform)
      );
    });
    totalLength = bundleTagBuffer.length + timetagBuffer.length;
    for (j = 0, len = elems.length; j < len; j++) {
      elem = elems[j];
      totalLength += 4 + elem.length;
    }
    outBuffer = new Buffer(totalLength);
    bundleTagBuffer.copy(outBuffer, 0);
    timetagBuffer.copy(outBuffer, bundleTagBuffer.length);
    copyIndex = bundleTagBuffer.length + timetagBuffer.length;
    for (k = 0, len1 = elems.length; k < len1; k++) {
      elem = elems[k];
      lengthBuff = toIntegerBuffer(elem.length);
      lengthBuff.copy(outBuffer, copyIndex);
      copyIndex += 4;
      elem.copy(outBuffer, copyIndex);
      copyIndex += elem.length;
    }
    return outBuffer;
  };
};

export const applyTransform = function (
  buffer,
  mTransform,
  bundleTransform?: (buffer: Buffer) => Buffer
) {
  if (bundleTransform == null) {
    bundleTransform = applyMessageTranformerToBundle(mTransform);
  }
  if (isOscBundleBuffer(buffer)) {
    return bundleTransform(buffer);
  } else {
    return mTransform(buffer);
  }
};

export const addressTransform = function (transform) {
  return function (buffer) {
    var ref, rest, string;
    (ref = splitOscString(buffer)), (string = ref.string), (rest = ref.rest);
    string = transform(string);
    return concat([toOscString(string), rest]);
  };
};

export const messageTransform = function (transform) {
  return function (buffer) {
    var message;
    message = fromOscMessage(buffer);
    return toOscMessage(transform(message));
  };
};

IsArray = Array.isArray;

class OSCError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OSCError";
  }
}

isOscBundleBuffer = function (buffer) {
  const string = splitOscString(buffer).string;
  return string === "#bundle";
};

mapBundleList = function (buffer, func) {
  var e, elem, elems, j, len, nonNullElems, size, thisElemBuffer;
  elems = (function () {
    var ref, results;
    results = [];
    while (buffer.length) {
      (ref = splitInteger(buffer)), (size = ref.integer), (buffer = ref.rest);
      if (size > buffer.length) {
        throw new Error(
          "Invalid bundle list: size of element is bigger than buffer"
        );
      }
      thisElemBuffer = buffer.slice(0, size);
      buffer = buffer.slice(size, buffer.length);
      try {
        results.push(func(thisElemBuffer));
      } catch (error) {
        e = error;
        results.push(null);
      }
    }
    return results;
  })();
  nonNullElems = [];
  for (j = 0, len = elems.length; j < len; j++) {
    elem = elems[j];
    if (elem != null) {
      nonNullElems.push(elem);
    }
  }
  return nonNullElems;
};
