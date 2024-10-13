import binpack from "binpack";

var IsArray,
  StrictError,
  TWO_POW_32,
  UNIX_EPOCH,
  getArrayArg,
  isOscBundleBuffer,
  makeTimetag,
  mapBundleList,
  oscTypeCodes,
  padding,
  toOscTypeAndArgs,
  hasProp = {}.hasOwnProperty;

export const concat = function (buffers) {
  var buffer, copyTo, destBuffer, j, k, l, len, len1, len2, sumLength;
  if (!IsArray(buffers)) {
    throw new Error("concat must take an array of buffers");
  }
  for (j = 0, len = buffers.length; j < len; j++) {
    buffer = buffers[j];
    if (!Buffer.isBuffer(buffer)) {
      throw new Error("concat must take an array of buffers");
    }
  }
  sumLength = 0;
  for (k = 0, len1 = buffers.length; k < len1; k++) {
    buffer = buffers[k];
    sumLength += buffer.length;
  }
  destBuffer = new Buffer(sumLength);
  copyTo = 0;
  for (l = 0, len2 = buffers.length; l < len2; l++) {
    buffer = buffers[l];
    buffer.copy(destBuffer, copyTo);
    copyTo += buffer.length;
  }
  return destBuffer;
};

export const toOscString = function (str, strict: boolean = false) {
  var i, j, nullIndex, ref;
  if (!(typeof str === "string")) {
    throw new Error("can't pack a non-string into an osc-string");
  }
  nullIndex = str.indexOf("\u0000");
  if (nullIndex !== -1 && strict) {
    throw StrictError("Can't pack an osc-string that contains NULL characters");
  }
  if (nullIndex !== -1) {
    str = str.slice(0, nullIndex);
  }
  for (
    i = j = 0, ref = padding(str);
    0 <= ref ? j < ref : j > ref;
    i = 0 <= ref ? ++j : --j
  ) {
    str += "\u0000";
  }
  return new Buffer(str);
};

export const splitOscString = function (buffer, strict: boolean = false) {
  var i, j, nullIndex, rawStr, ref, ref1, rest, splitPoint, str;
  if (!Buffer.isBuffer(buffer)) {
    throw StrictError("Can't split something that isn't a buffer");
  }
  rawStr = buffer.toString("utf8");
  nullIndex = rawStr.indexOf("\u0000");
  if (nullIndex === -1) {
    if (strict) {
      throw new Error("All osc-strings must contain a null character");
    }
    return {
      string: rawStr,
      rest: new Buffer(0),
    };
  }
  str = rawStr.slice(0, nullIndex);
  splitPoint = Buffer.byteLength(str) + padding(str);
  if (strict && splitPoint > buffer.length) {
    throw StrictError("Not enough padding for osc-string");
  }
  if (strict) {
    for (
      i = j = ref = Buffer.byteLength(str), ref1 = splitPoint;
      ref <= ref1 ? j < ref1 : j > ref1;
      i = ref <= ref1 ? ++j : --j
    ) {
      if (buffer[i] !== 0) {
        throw StrictError("Not enough or incorrect padding for osc-string");
      }
    }
  }
  rest = buffer.slice(splitPoint, buffer.length);
  return {
    string: str,
    rest: rest,
  };
};

export const splitInteger = function (buffer, type?: string) {
  var bytes, num, rest, value;
  if (type == null) {
    type = "Int32";
  }
  bytes = binpack["pack" + type](0).length;
  if (buffer.length < bytes) {
    throw new Error("buffer is not big enough for integer type");
  }
  num = 0;
  value = binpack["unpack" + type](buffer.slice(0, bytes), "big");
  rest = buffer.slice(bytes, buffer.length);
  return {
    integer: value,
    rest: rest,
  };
};

export const splitTimetag = function (buffer) {
  var a, b, bytes, c, d, fractional, rest, seconds, type;
  type = "UInt32";
  bytes = binpack["pack" + type](0).length;
  if (buffer.length < bytes * 2) {
    throw new Error("buffer is not big enough to contain a timetag");
  }
  a = 0;
  b = bytes;
  seconds = binpack["unpack" + type](buffer.slice(a, b), "big");
  c = bytes;
  d = bytes + bytes;
  fractional = binpack["unpack" + type](buffer.slice(c, d), "big");
  rest = buffer.slice(d, buffer.length);
  return {
    timetag: [seconds, fractional],
    rest: rest,
  };
};

UNIX_EPOCH = 2208988800;

TWO_POW_32 = 4294967296;

export const dateToTimetag = function (date) {
  return timestampToTimetag(date.getTime() / 1000);
};

export const timestampToTimetag = function (secs) {
  var fracSeconds, wholeSecs;
  wholeSecs = Math.floor(secs);
  fracSeconds = secs - wholeSecs;
  return makeTimetag(wholeSecs, fracSeconds);
};

export const timetagToTimestamp = function (timetag) {
  var seconds;
  seconds = timetag[0] + ntpToFractionalSeconds(timetag[1]);
  return seconds - UNIX_EPOCH;
};

makeTimetag = function (unixseconds, fracSeconds) {
  var ntpFracs, ntpSecs;
  ntpSecs = unixseconds + UNIX_EPOCH;
  ntpFracs = Math.round(TWO_POW_32 * fracSeconds);
  return [ntpSecs, ntpFracs];
};

export const timetagToDate = function (timetag) {
  var date, dd, fracs, fractional, seconds;
  (seconds = timetag[0]), (fractional = timetag[1]);
  seconds = seconds - UNIX_EPOCH;
  fracs = ntpToFractionalSeconds(fractional);
  date = new Date();
  date.setTime(seconds * 1000 + fracs * 1000);
  dd = new Date();
  dd.setUTCFullYear(date.getUTCFullYear());
  dd.setUTCMonth(date.getUTCMonth());
  dd.setUTCDate(date.getUTCDate());
  dd.setUTCHours(date.getUTCHours());
  dd.setUTCMinutes(date.getUTCMinutes());
  dd.setUTCSeconds(date.getUTCSeconds());
  dd.setUTCMilliseconds(fracs * 1000);
  return dd;
};

export const deltaTimetag = function (seconds, now) {
  var n;
  n = (now != null ? now : new Date()) / 1000;
  return timestampToTimetag(n + seconds);
};

export const ntpToFractionalSeconds = function (fracSeconds) {
  return parseFloat(fracSeconds) / TWO_POW_32;
};

export const toTimetagBuffer = function (timetag) {
  var high, low, type;
  if (typeof timetag === "number") {
    timetag = timestampToTimetag(timetag);
  } else if (typeof timetag === "object" && "getTime" in timetag) {
    timetag = dateToTimetag(timetag);
  } else if (timetag.length !== 2) {
    throw new Error("Invalid timetag" + timetag);
  }
  type = "UInt32";
  high = binpack["pack" + type](timetag[0], "big");
  low = binpack["pack" + type](timetag[1], "big");
  return concat([high, low]);
};

export const toIntegerBuffer = function (number, type?: string) {
  if (type == null) {
    type = "Int32";
  }
  if (typeof number !== "number") {
    throw new Error("cannot pack a non-number into an integer buffer");
  }
  return binpack["pack" + type](number, "big");
};

oscTypeCodes = {
  s: {
    representation: "string",
    split: function (buffer, strict) {
      var split;
      split = splitOscString(buffer, strict);
      return {
        value: split.string,
        rest: split.rest,
      };
    },
    toArg: function (value, strict) {
      if (typeof value !== "string") {
        throw new Error("expected string");
      }
      return toOscString(value, strict);
    },
  },
  i: {
    representation: "integer",
    split: function (buffer, strict) {
      var split;
      split = splitInteger(buffer);
      return {
        value: split.integer,
        rest: split.rest,
      };
    },
    toArg: function (value, strict) {
      if (typeof value !== "number") {
        throw new Error("expected number");
      }
      return toIntegerBuffer(value);
    },
  },
  t: {
    representation: "timetag",
    split: function (buffer, strict) {
      var split;
      split = splitTimetag(buffer);
      return {
        value: split.timetag,
        rest: split.rest,
      };
    },
    toArg: function (value, strict) {
      return toTimetagBuffer(value);
    },
  },
  f: {
    representation: "float",
    split: function (buffer, strict) {
      return {
        value: binpack.unpackFloat32(buffer.slice(0, 4), "big"),
        rest: buffer.slice(4, buffer.length),
      };
    },
    toArg: function (value, strict) {
      if (typeof value !== "number") {
        throw new Error("expected number");
      }
      return binpack.packFloat32(value, "big");
    },
  },
  d: {
    representation: "double",
    split: function (buffer, strict) {
      return {
        value: binpack.unpackFloat64(buffer.slice(0, 8), "big"),
        rest: buffer.slice(8, buffer.length),
      };
    },
    toArg: function (value, strict) {
      if (typeof value !== "number") {
        throw new Error("expected number");
      }
      return binpack.packFloat64(value, "big");
    },
  },
  b: {
    representation: "blob",
    split: function (buffer, strict) {
      var length, ref;
      (ref = splitInteger(buffer)), (length = ref.integer), (buffer = ref.rest);
      return {
        value: buffer.slice(0, length),
        rest: buffer.slice(length, buffer.length),
      };
    },
    toArg: function (value, strict) {
      var size;
      if (!Buffer.isBuffer(value)) {
        throw new Error("expected node.js Buffer");
      }
      size = toIntegerBuffer(value.length);
      return concat([size, value]);
    },
  },
  T: {
    representation: "true",
    split: function (buffer, strict) {
      return {
        rest: buffer,
        value: true,
      };
    },
    toArg: function (value, strict) {
      if (!value && strict) {
        throw new Error("true must be true");
      }
      return new Buffer(0);
    },
  },
  F: {
    representation: "false",
    split: function (buffer, strict) {
      return {
        rest: buffer,
        value: false,
      };
    },
    toArg: function (value, strict) {
      if (value && strict) {
        throw new Error("false must be false");
      }
      return new Buffer(0);
    },
  },
  N: {
    representation: "null",
    split: function (buffer, strict) {
      return {
        rest: buffer,
        value: null,
      };
    },
    toArg: function (value, strict) {
      if (value && strict) {
        throw new Error("null must be false");
      }
      return new Buffer(0);
    },
  },
  I: {
    representation: "bang",
    split: function (buffer, strict) {
      return {
        rest: buffer,
        value: "bang",
      };
    },
    toArg: function (value, strict) {
      return new Buffer(0);
    },
  },
};

export const oscTypeCodeToTypeString = function (code) {
  var ref;
  return (ref = oscTypeCodes[code]) != null ? ref.representation : void 0;
};

export const typeStringToOscTypeCode = function (rep) {
  var code, str;
  for (code in oscTypeCodes) {
    if (!hasProp.call(oscTypeCodes, code)) continue;
    str = oscTypeCodes[code].representation;
    if (str === rep) {
      return code;
    }
  }
  return null;
};

export const argToTypeCode = function (arg, strict) {
  var code, value;
  if (
    (arg != null ? arg.type : void 0) != null &&
    typeof arg.type === "string" &&
    (code = typeStringToOscTypeCode(arg.type)) != null
  ) {
    return code;
  }
  value = (arg != null ? arg.value : void 0) != null ? arg.value : arg;
  if (strict && value == null) {
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

export const splitOscArgument = function (buffer, type, strict) {
  var osctype;
  osctype = typeStringToOscTypeCode(type);
  if (osctype != null) {
    return oscTypeCodes[osctype].split(buffer, strict);
  } else {
    throw new Error("I don't understand how I'm supposed to unpack " + type);
  }
};

export const toOscArgument = function (value, type, strict) {
  var osctype;
  osctype = typeStringToOscTypeCode(type);
  if (osctype != null) {
    return oscTypeCodes[osctype].toArg(value, strict);
  } else {
    throw new Error("I don't know how to pack " + type);
  }
};

export const fromOscMessage = function (buffer, strict: boolean = false) {
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
  (ref = splitOscString(buffer, strict)),
    (address = ref.string),
    (buffer = ref.rest);
  if (strict && address[0] !== "/") {
    throw StrictError("addresses must start with /");
  }
  if (!buffer.length) {
    return {
      address: address,
      args: [],
    };
  }
  (ref1 = splitOscString(buffer, strict)),
    (types = ref1.string),
    (buffer = ref1.rest);
  if (types[0] !== ",") {
    if (strict) {
      throw StrictError("Argument lists must begin with ,");
    }
    return {
      address: address,
      args: [],
    };
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
        if (strict) {
          throw new StrictError("Mismatched ']' character.");
        }
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
    arg = splitOscArgument(buffer, typeString, strict);
    if (arg != null) {
      buffer = arg.rest;
    }
    arrayStack[arrayStack.length - 1].push({
      type: typeString,
      value: arg != null ? arg.value : void 0,
    });
  }
  if (arrayStack.length !== 1 && strict) {
    throw new StrictError("Mismatched '[' character");
  }
  return {
    address: address,
    args: args,
    oscType: "message",
  };
};

export const fromOscBundle = function (buffer, strict) {
  var bundleTag, convertedElems, ref, ref1, timetag;
  (ref = splitOscString(buffer, strict)),
    (bundleTag = ref.string),
    (buffer = ref.rest);
  if (bundleTag !== "#bundle") {
    throw new Error("osc-bundles must begin with #bundle");
  }
  (ref1 = splitTimetag(buffer)), (timetag = ref1.timetag), (buffer = ref1.rest);
  convertedElems = mapBundleList(buffer, function (buffer) {
    return fromOscPacket(buffer, strict);
  });
  return {
    timetag: timetag,
    elements: convertedElems,
    oscType: "bundle",
  };
};

export const fromOscPacket = function (buffer, strict) {
  if (isOscBundleBuffer(buffer, strict)) {
    return fromOscBundle(buffer, strict);
  } else {
    return fromOscMessage(buffer, strict);
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

toOscTypeAndArgs = function (argList, strict) {
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
      (ref = toOscTypeAndArgs(getArrayArg(arg), strict)),
        (thisType = ref[0]),
        (thisArgs = ref[1]);
      osctype += "[" + thisType + "]";
      oscargs = oscargs.concat(thisArgs);
      continue;
    }
    typeCode = argToTypeCode(arg, strict);
    if (typeCode != null) {
      value = arg != null ? arg.value : void 0;
      if (value === void 0) {
        value = arg;
      }
      buff = toOscArgument(value, oscTypeCodeToTypeString(typeCode), strict);
      if (buff != null) {
        oscargs.push(buff);
        osctype += typeCode;
      }
    }
  }
  return [osctype, oscargs];
};

export const toOscMessage = function (message, strict: boolean = false) {
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
  oscaddr = toOscString(address, strict);
  (ref = toOscTypeAndArgs(args, strict)),
    (osctype = ref[0]),
    (oscargs = ref[1]);
  osctype = "," + osctype;
  allArgs = concat(oscargs);
  osctype = toOscString(osctype);
  return concat([oscaddr, osctype, allArgs]);
};

export const toOscBundle = function (bundle, strict) {
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
  if (strict && (bundle != null ? bundle.timetag : void 0) == null) {
    throw StrictError("bundles must have timetags.");
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
      buff = toOscPacket(elem, strict);
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

export const toOscPacket = function (bundleOrMessage, strict) {
  if ((bundleOrMessage != null ? bundleOrMessage.oscType : void 0) != null) {
    if (bundleOrMessage.oscType === "bundle") {
      return toOscBundle(bundleOrMessage, strict);
    }
    return toOscMessage(bundleOrMessage, strict);
  }
  if (
    (bundleOrMessage != null ? bundleOrMessage.timetag : void 0) != null ||
    (bundleOrMessage != null ? bundleOrMessage.elements : void 0) != null
  ) {
    return toOscBundle(bundleOrMessage, strict);
  }
  return toOscMessage(bundleOrMessage, strict);
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

StrictError = function (str) {
  return new Error("Strict Error: " + str);
};

padding = function (str) {
  var bufflength;
  bufflength = Buffer.byteLength(str);
  return 4 - (bufflength % 4);
};

isOscBundleBuffer = function (buffer, strict) {
  var string;
  string = splitOscString(buffer, strict).string;
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
