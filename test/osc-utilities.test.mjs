import * as osc from "../lib/osc-utilities";
import assert from "assert";

var assertDatesEqual,
  buffeq,
  e,
  roundTripBundle,
  roundTripMessage,
  testData,
  testString,
  testStringLength,
  testStringRoundTrip,
  toOscMessageThrowsHelper;

testString = function (str, expected_len) {
  return {
    str: str,
    len: expected_len,
  };
};

testData = [
  testString("abc", 4),
  testString("abcd", 8),
  testString("abcde", 8),
  testString("abcdef", 8),
  testString("abcdefg", 8),
];

testStringLength = function (str, expected_len) {
  var oscstr;
  oscstr = osc.toOscString(str);
  return assert.strictEqual(oscstr.length, expected_len);
};

test("basic strings length", function () {
  var data, k, len;
  for (k = 0, len = testData.length; k < len; k++) {
    data = testData[k];
    testStringLength(data.str, data.len);
  }
});

testStringRoundTrip = function (str, strict) {
  var oscstr, ref, str2;
  oscstr = osc.toOscString(str);
  str2 =
    (ref = osc.splitOscString(oscstr, strict)) != null ? ref.string : void 0;
  return assert.strictEqual(str, str2);
};

test("basic strings round trip", function () {
  var data, k, len;
  for (k = 0, len = testData.length; k < len; k++) {
    data = testData[k];
    testStringRoundTrip(data.str);
  }
});

test("non strings fail toOscString", function () {
  return assert.throws(function () {
    return osc.toOscString(7);
  });
});

test("strings with null characters don't fail toOscString by default", function () {
  return assert.notEqual(osc.toOscString("\u0000"), null);
});

test("strings with null characters fail toOscString in strict mode", function () {
  return assert.throws(function () {
    return osc.toOscString("\u0000", true);
  });
});

test("osc buffers with no null characters fail splitOscString in strict mode", function () {
  return assert.throws(function () {
    return osc.splitOscString(new Buffer("abc"), true);
  });
});

test("osc buffers with non-null characters after a null character fail fromOscString in strict mode", function () {
  return assert.throws(function () {
    return osc.fromOscString(new Buffer("abc\u0000abcd"), true);
  });
});

test("basic strings pass fromOscString in strict mode", function () {
  var data, k, len;
  for (k = 0, len = testData.length; k < len; k++) {
    data = testData[k];
    testStringRoundTrip(data.str, true);
  }
});

test("osc buffers with non-four length fail in strict mode", function () {
  return assert.throws(function () {
    return osc.fromOscString(new Buffer("abcd\u0000\u0000"), true);
  });
});

test("splitOscString throws when passed a non-buffer", function () {
  return assert.throws(function () {
    return osc.splitOscString("test");
  });
});

test("splitOscString of an osc-string matches the string", function () {
  var ref, split;
  split = osc.splitOscString(osc.toOscString("testing it"));
  assert.strictEqual(split != null ? split.string : void 0, "testing it");
  return assert.strictEqual(
    split != null ? ((ref = split.rest) != null ? ref.length : void 0) : void 0,
    0
  );
});

test("splitOscString works with an over-allocated buffer", function () {
  var buffer, overallocated, ref, split;
  buffer = osc.toOscString("testing it");
  overallocated = new Buffer(16);
  buffer.copy(overallocated);
  split = osc.splitOscString(overallocated);
  assert.strictEqual(split != null ? split.string : void 0, "testing it");
  return assert.strictEqual(
    split != null ? ((ref = split.rest) != null ? ref.length : void 0) : void 0,
    4
  );
});

test("splitOscString works with just a string by default", function () {
  var ref, split;
  split = osc.splitOscString(new Buffer("testing it"));
  assert.strictEqual(split != null ? split.string : void 0, "testing it");
  return assert.strictEqual(
    split != null ? ((ref = split.rest) != null ? ref.length : void 0) : void 0,
    0
  );
});

test("splitOscString strict fails for just a string", function () {
  return assert.throws(function () {
    return osc.splitOscString(new Buffer("testing it"), true);
  });
});

test("splitOscString strict fails for string with not enough padding", function () {
  return assert.throws(function () {
    return osc.splitOscString(new Buffer("testing \u0000\u0000"), true);
  });
});

test("splitOscString strict succeeds for strings with valid padding", function () {
  var ref, split;
  split = osc.splitOscString(new Buffer("testing it\u0000\u0000aaaa"), true);
  assert.strictEqual(split != null ? split.string : void 0, "testing it");
  return assert.strictEqual(
    split != null ? ((ref = split.rest) != null ? ref.length : void 0) : void 0,
    4
  );
});

test("splitOscString strict fails for string with invalid padding", function () {
  return assert.throws(function () {
    return osc.splitOscString(new Buffer("testing it\u0000aaaaa"), true);
  });
});

test("concat throws when passed a single buffer", function () {
  return assert.throws(function () {
    return osc.concat(new Buffer("test"));
  });
});

test("concat throws when passed an array of non-buffers", function () {
  return assert.throws(function () {
    return osc.concat(["bleh"]);
  });
});

test("toIntegerBuffer throws when passed a non-number", function () {
  return assert.throws(function () {
    return osc.toIntegerBuffer("abcdefg");
  });
});

test("splitInteger fails when sent a buffer that's too small", function () {
  return assert.throws(function () {
    return osc.splitInteger(new Buffer(3, "Int32"));
  });
});

test("splitOscArgument fails when given a bogus type", function () {
  return assert.throws(function () {
    return osc.splitOscArgument(new Buffer(8, "bogus"));
  });
});

test("fromOscMessage with no type string works", function () {
  var translate;
  translate = osc.fromOscMessage(osc.toOscString("/stuff"));
  assert.strictEqual(translate != null ? translate.address : void 0, "/stuff");
  return assert.deepEqual(translate != null ? translate.args : void 0, []);
});

test("fromOscMessage with type string and no args works", function () {
  var oscaddr, oscmessage, osctype, translate;
  oscaddr = osc.toOscString("/stuff");
  osctype = osc.toOscString(",");
  oscmessage = new Buffer(oscaddr.length + osctype.length);
  oscaddr.copy(oscmessage);
  osctype.copy(oscmessage, oscaddr.length);
  translate = osc.fromOscMessage(oscmessage);
  assert.strictEqual(translate != null ? translate.address : void 0, "/stuff");
  return assert.deepEqual(translate != null ? translate.args : void 0, []);
});

test("fromOscMessage with string argument works", function () {
  var oscaddr, oscarg, osctype, ref, ref1, ref2, ref3, translate;
  oscaddr = osc.toOscString("/stuff");
  osctype = osc.toOscString(",s");
  oscarg = osc.toOscString("argu");
  translate = osc.fromOscMessage(osc.concat([oscaddr, osctype, oscarg]));
  assert.strictEqual(translate != null ? translate.address : void 0, "/stuff");
  assert.strictEqual(
    translate != null
      ? (ref = translate.args) != null
        ? (ref1 = ref[0]) != null
          ? ref1.type
          : void 0
        : void 0
      : void 0,
    "string"
  );
  return assert.strictEqual(
    translate != null
      ? (ref2 = translate.args) != null
        ? (ref3 = ref2[0]) != null
          ? ref3.value
          : void 0
        : void 0
      : void 0,
    "argu"
  );
});

test("fromOscMessage with true argument works", function () {
  var oscaddr, osctype, ref, ref1, ref2, ref3, translate;
  oscaddr = osc.toOscString("/stuff");
  osctype = osc.toOscString(",T");
  translate = osc.fromOscMessage(osc.concat([oscaddr, osctype]));
  assert.strictEqual(translate != null ? translate.address : void 0, "/stuff");
  assert.strictEqual(
    translate != null
      ? (ref = translate.args) != null
        ? (ref1 = ref[0]) != null
          ? ref1.type
          : void 0
        : void 0
      : void 0,
    "true"
  );
  return assert.strictEqual(
    translate != null
      ? (ref2 = translate.args) != null
        ? (ref3 = ref2[0]) != null
          ? ref3.value
          : void 0
        : void 0
      : void 0,
    true
  );
});

test("fromOscMessage with false argument works", function () {
  var oscaddr, osctype, ref, ref1, ref2, ref3, translate;
  oscaddr = osc.toOscString("/stuff");
  osctype = osc.toOscString(",F");
  translate = osc.fromOscMessage(osc.concat([oscaddr, osctype]));
  assert.strictEqual(translate != null ? translate.address : void 0, "/stuff");
  assert.strictEqual(
    translate != null
      ? (ref = translate.args) != null
        ? (ref1 = ref[0]) != null
          ? ref1.type
          : void 0
        : void 0
      : void 0,
    "false"
  );
  return assert.strictEqual(
    translate != null
      ? (ref2 = translate.args) != null
        ? (ref3 = ref2[0]) != null
          ? ref3.value
          : void 0
        : void 0
      : void 0,
    false
  );
});

test("fromOscMessage with null argument works", function () {
  var oscaddr, osctype, ref, ref1, ref2, ref3, translate;
  oscaddr = osc.toOscString("/stuff");
  osctype = osc.toOscString(",N");
  translate = osc.fromOscMessage(osc.concat([oscaddr, osctype]));
  assert.strictEqual(translate != null ? translate.address : void 0, "/stuff");
  assert.strictEqual(
    translate != null
      ? (ref = translate.args) != null
        ? (ref1 = ref[0]) != null
          ? ref1.type
          : void 0
        : void 0
      : void 0,
    "null"
  );
  return assert.strictEqual(
    translate != null
      ? (ref2 = translate.args) != null
        ? (ref3 = ref2[0]) != null
          ? ref3.value
          : void 0
        : void 0
      : void 0,
    null
  );
});

test("fromOscMessage with bang argument works", function () {
  var oscaddr, osctype, ref, ref1, ref2, ref3, translate;
  oscaddr = osc.toOscString("/stuff");
  osctype = osc.toOscString(",I");
  translate = osc.fromOscMessage(osc.concat([oscaddr, osctype]));
  assert.strictEqual(translate != null ? translate.address : void 0, "/stuff");
  assert.strictEqual(
    translate != null
      ? (ref = translate.args) != null
        ? (ref1 = ref[0]) != null
          ? ref1.type
          : void 0
        : void 0
      : void 0,
    "bang"
  );
  return assert.strictEqual(
    translate != null
      ? (ref2 = translate.args) != null
        ? (ref3 = ref2[0]) != null
          ? ref3.value
          : void 0
        : void 0
      : void 0,
    "bang"
  );
});

test("fromOscMessage with blob argument works", function () {
  var oscaddr, oscarg, osctype, ref, ref1, ref2, ref3, ref4, translate;
  oscaddr = osc.toOscString("/stuff");
  osctype = osc.toOscString(",b");
  oscarg = osc.concat([osc.toIntegerBuffer(4), new Buffer("argu")]);
  translate = osc.fromOscMessage(osc.concat([oscaddr, osctype, oscarg]));
  assert.strictEqual(translate != null ? translate.address : void 0, "/stuff");
  assert.strictEqual(
    translate != null
      ? (ref = translate.args) != null
        ? (ref1 = ref[0]) != null
          ? ref1.type
          : void 0
        : void 0
      : void 0,
    "blob"
  );
  return assert.strictEqual(
    translate != null
      ? (ref2 = translate.args) != null
        ? (ref3 = ref2[0]) != null
          ? (ref4 = ref3.value) != null
            ? ref4.toString("utf8")
            : void 0
          : void 0
        : void 0
      : void 0,
    "argu"
  );
});

test("fromOscMessage with integer argument works", function () {
  var oscaddr, oscarg, osctype, ref, ref1, ref2, ref3, translate;
  oscaddr = osc.toOscString("/stuff");
  osctype = osc.toOscString(",i");
  oscarg = osc.toIntegerBuffer(888);
  translate = osc.fromOscMessage(osc.concat([oscaddr, osctype, oscarg]));
  assert.strictEqual(translate != null ? translate.address : void 0, "/stuff");
  assert.strictEqual(
    translate != null
      ? (ref = translate.args) != null
        ? (ref1 = ref[0]) != null
          ? ref1.type
          : void 0
        : void 0
      : void 0,
    "integer"
  );
  return assert.strictEqual(
    translate != null
      ? (ref2 = translate.args) != null
        ? (ref3 = ref2[0]) != null
          ? ref3.value
          : void 0
        : void 0
      : void 0,
    888
  );
});

test("fromOscMessage with timetag argument works", function () {
  var oscaddr, oscarg, osctype, ref, ref1, ref2, ref3, timetag, translate;
  oscaddr = osc.toOscString("/stuff");
  osctype = osc.toOscString(",t");
  timetag = [8888, 9999];
  oscarg = osc.toTimetagBuffer(timetag);
  translate = osc.fromOscMessage(osc.concat([oscaddr, osctype, oscarg]));
  assert.strictEqual(translate != null ? translate.address : void 0, "/stuff");
  assert.strictEqual(
    translate != null
      ? (ref = translate.args) != null
        ? (ref1 = ref[0]) != null
          ? ref1.type
          : void 0
        : void 0
      : void 0,
    "timetag"
  );
  return assert.deepEqual(
    translate != null
      ? (ref2 = translate.args) != null
        ? (ref3 = ref2[0]) != null
          ? ref3.value
          : void 0
        : void 0
      : void 0,
    timetag
  );
});

test("fromOscMessage with mismatched array doesn't throw", function () {
  var oscaddr;
  oscaddr = osc.toOscString("/stuff");
  assert.doesNotThrow(function () {
    return osc.fromOscMessage(osc.concat([oscaddr, osc.toOscString(",[")]));
  });
  return assert.doesNotThrow(function () {
    return osc.fromOscMessage(osc.concat([oscaddr, osc.toOscString(",[")]));
  });
});

test("fromOscMessage with mismatched array throws in strict", function () {
  var oscaddr;
  oscaddr = osc.toOscString("/stuff");
  assert.throws(function () {
    return osc.fromOscMessage(
      osc.concat([oscaddr, osc.toOscString(",[")]),
      true
    );
  });
  return assert.throws(function () {
    return osc.fromOscMessage(
      osc.concat([oscaddr, osc.toOscString(",]")]),
      true
    );
  });
});

test("fromOscMessage with empty array argument works", function () {
  var oscaddr, osctype, ref, ref1, ref2, ref3, ref4, ref5, ref6, translate;
  oscaddr = osc.toOscString("/stuff");
  osctype = osc.toOscString(",[]");
  translate = osc.fromOscMessage(osc.concat([oscaddr, osctype]));
  assert.strictEqual(translate != null ? translate.address : void 0, "/stuff");
  assert.strictEqual(
    translate != null
      ? (ref = translate.args) != null
        ? (ref1 = ref[0]) != null
          ? ref1.type
          : void 0
        : void 0
      : void 0,
    "array"
  );
  assert.strictEqual(
    translate != null
      ? (ref2 = translate.args) != null
        ? (ref3 = ref2[0]) != null
          ? (ref4 = ref3.value) != null
            ? ref4.length
            : void 0
          : void 0
        : void 0
      : void 0,
    0
  );
  return assert.deepEqual(
    translate != null
      ? (ref5 = translate.args) != null
        ? (ref6 = ref5[0]) != null
          ? ref6.value
          : void 0
        : void 0
      : void 0,
    []
  );
});

test("fromOscMessage with bang array argument works", function () {
  var oscaddr,
    osctype,
    ref,
    ref1,
    ref10,
    ref11,
    ref12,
    ref2,
    ref3,
    ref4,
    ref5,
    ref6,
    ref7,
    ref8,
    ref9,
    translate;
  oscaddr = osc.toOscString("/stuff");
  osctype = osc.toOscString(",[I]");
  translate = osc.fromOscMessage(osc.concat([oscaddr, osctype]));
  assert.strictEqual(translate != null ? translate.address : void 0, "/stuff");
  assert.strictEqual(
    translate != null
      ? (ref = translate.args) != null
        ? (ref1 = ref[0]) != null
          ? ref1.type
          : void 0
        : void 0
      : void 0,
    "array"
  );
  assert.strictEqual(
    translate != null
      ? (ref2 = translate.args) != null
        ? (ref3 = ref2[0]) != null
          ? (ref4 = ref3.value) != null
            ? ref4.length
            : void 0
          : void 0
        : void 0
      : void 0,
    1
  );
  assert.strictEqual(
    translate != null
      ? (ref5 = translate.args) != null
        ? (ref6 = ref5[0]) != null
          ? (ref7 = ref6.value) != null
            ? (ref8 = ref7[0]) != null
              ? ref8.type
              : void 0
            : void 0
          : void 0
        : void 0
      : void 0,
    "bang"
  );
  return assert.strictEqual(
    translate != null
      ? (ref9 = translate.args) != null
        ? (ref10 = ref9[0]) != null
          ? (ref11 = ref10.value) != null
            ? (ref12 = ref11[0]) != null
              ? ref12.value
              : void 0
            : void 0
          : void 0
        : void 0
      : void 0,
    "bang"
  );
});

test("fromOscMessage with string array argument works", function () {
  var oscaddr,
    oscarg,
    osctype,
    ref,
    ref1,
    ref10,
    ref11,
    ref12,
    ref2,
    ref3,
    ref4,
    ref5,
    ref6,
    ref7,
    ref8,
    ref9,
    translate;
  oscaddr = osc.toOscString("/stuff");
  osctype = osc.toOscString(",[s]");
  oscarg = osc.toOscString("argu");
  translate = osc.fromOscMessage(osc.concat([oscaddr, osctype, oscarg]));
  assert.strictEqual(translate != null ? translate.address : void 0, "/stuff");
  assert.strictEqual(
    translate != null
      ? (ref = translate.args) != null
        ? (ref1 = ref[0]) != null
          ? ref1.type
          : void 0
        : void 0
      : void 0,
    "array"
  );
  assert.strictEqual(
    translate != null
      ? (ref2 = translate.args) != null
        ? (ref3 = ref2[0]) != null
          ? (ref4 = ref3.value) != null
            ? ref4.length
            : void 0
          : void 0
        : void 0
      : void 0,
    1
  );
  assert.strictEqual(
    translate != null
      ? (ref5 = translate.args) != null
        ? (ref6 = ref5[0]) != null
          ? (ref7 = ref6.value) != null
            ? (ref8 = ref7[0]) != null
              ? ref8.type
              : void 0
            : void 0
          : void 0
        : void 0
      : void 0,
    "string"
  );
  return assert.strictEqual(
    translate != null
      ? (ref9 = translate.args) != null
        ? (ref10 = ref9[0]) != null
          ? (ref11 = ref10.value) != null
            ? (ref12 = ref11[0]) != null
              ? ref12.value
              : void 0
            : void 0
          : void 0
        : void 0
      : void 0,
    "argu"
  );
});

test("fromOscMessage with nested array argument works", function () {
  var oscaddr,
    osctype,
    ref,
    ref1,
    ref10,
    ref11,
    ref12,
    ref13,
    ref14,
    ref15,
    ref16,
    ref17,
    ref18,
    ref19,
    ref2,
    ref20,
    ref21,
    ref22,
    ref23,
    ref24,
    ref25,
    ref3,
    ref4,
    ref5,
    ref6,
    ref7,
    ref8,
    ref9,
    translate;
  oscaddr = osc.toOscString("/stuff");
  osctype = osc.toOscString(",[[I]]");
  translate = osc.fromOscMessage(osc.concat([oscaddr, osctype]));
  assert.strictEqual(translate != null ? translate.address : void 0, "/stuff");
  assert.strictEqual(
    translate != null
      ? (ref = translate.args) != null
        ? (ref1 = ref[0]) != null
          ? ref1.type
          : void 0
        : void 0
      : void 0,
    "array"
  );
  assert.strictEqual(
    translate != null
      ? (ref2 = translate.args) != null
        ? (ref3 = ref2[0]) != null
          ? (ref4 = ref3.value) != null
            ? ref4.length
            : void 0
          : void 0
        : void 0
      : void 0,
    1
  );
  assert.strictEqual(
    translate != null
      ? (ref5 = translate.args) != null
        ? (ref6 = ref5[0]) != null
          ? (ref7 = ref6.value) != null
            ? (ref8 = ref7[0]) != null
              ? ref8.type
              : void 0
            : void 0
          : void 0
        : void 0
      : void 0,
    "array"
  );
  assert.strictEqual(
    translate != null
      ? (ref9 = translate.args) != null
        ? (ref10 = ref9[0]) != null
          ? (ref11 = ref10.value) != null
            ? (ref12 = ref11[0]) != null
              ? (ref13 = ref12.value) != null
                ? ref13.length
                : void 0
              : void 0
            : void 0
          : void 0
        : void 0
      : void 0,
    1
  );
  assert.strictEqual(
    translate != null
      ? (ref14 = translate.args) != null
        ? (ref15 = ref14[0]) != null
          ? (ref16 = ref15.value) != null
            ? (ref17 = ref16[0]) != null
              ? (ref18 = ref17.value) != null
                ? (ref19 = ref18[0]) != null
                  ? ref19.type
                  : void 0
                : void 0
              : void 0
            : void 0
          : void 0
        : void 0
      : void 0,
    "bang"
  );
  return assert.strictEqual(
    translate != null
      ? (ref20 = translate.args) != null
        ? (ref21 = ref20[0]) != null
          ? (ref22 = ref21.value) != null
            ? (ref23 = ref22[0]) != null
              ? (ref24 = ref23.value) != null
                ? (ref25 = ref24[0]) != null
                  ? ref25.value
                  : void 0
                : void 0
              : void 0
            : void 0
          : void 0
        : void 0
      : void 0,
    "bang"
  );
});

test("fromOscMessage with multiple args works", function () {
  var oscaddr, oscargs, oscbuffer, osctype, ref, ref1, ref2, ref3, translate;
  oscaddr = osc.toOscString("/stuff");
  osctype = osc.toOscString(",sbi");
  oscargs = [
    osc.toOscString("argu"),
    osc.concat([osc.toIntegerBuffer(4), new Buffer("argu")]),
    osc.toIntegerBuffer(888),
  ];
  oscbuffer = osc.concat([oscaddr, osctype, osc.concat(oscargs)]);
  translate = osc.fromOscMessage(oscbuffer);
  assert.strictEqual(translate != null ? translate.address : void 0, "/stuff");
  assert.strictEqual(
    translate != null
      ? (ref = translate.args) != null
        ? (ref1 = ref[0]) != null
          ? ref1.type
          : void 0
        : void 0
      : void 0,
    "string"
  );
  return assert.strictEqual(
    translate != null
      ? (ref2 = translate.args) != null
        ? (ref3 = ref2[0]) != null
          ? ref3.value
          : void 0
        : void 0
      : void 0,
    "argu"
  );
});

test("fromOscMessage strict fails if type string has no comma", function () {
  var oscaddr, osctype;
  oscaddr = osc.toOscString("/stuff");
  osctype = osc.toOscString("fake");
  return assert.throws(function () {
    return osc.fromOscMessage(osc.concat([oscaddr, osctype]), true);
  });
});

test("fromOscMessage non-strict works if type string has no comma", function () {
  var message, oscaddr, osctype;
  oscaddr = osc.toOscString("/stuff");
  osctype = osc.toOscString("fake");
  message = osc.fromOscMessage(osc.concat([oscaddr, osctype]));
  assert.strictEqual(message.address, "/stuff");
  return assert.strictEqual(message.args.length, 0);
});

test("fromOscMessage strict fails if type address doesn't begin with /", function () {
  var oscaddr, osctype;
  oscaddr = osc.toOscString("stuff");
  osctype = osc.toOscString(",");
  return assert.throws(function () {
    return osc.fromOscMessage(osc.concat([oscaddr, osctype]), true);
  });
});

test("fromOscBundle works with no messages", function () {
  var buffer, oscbundle, osctimetag, timetag, translate;
  oscbundle = osc.toOscString("#bundle");
  timetag = [0, 0];
  osctimetag = osc.toTimetagBuffer(timetag);
  buffer = osc.concat([oscbundle, osctimetag]);
  translate = osc.fromOscBundle(buffer);
  assert.deepEqual(translate != null ? translate.timetag : void 0, timetag);
  return assert.deepEqual(translate != null ? translate.elements : void 0, []);
});

test("fromOscBundle works with single message", function () {
  var buffer,
    oscaddr,
    oscbundle,
    osclen,
    oscmessage,
    osctimetag,
    osctype,
    ref,
    ref1,
    ref2,
    timetag,
    translate;
  oscbundle = osc.toOscString("#bundle");
  timetag = [0, 0];
  osctimetag = osc.toTimetagBuffer(timetag);
  oscaddr = osc.toOscString("/addr");
  osctype = osc.toOscString(",");
  oscmessage = osc.concat([oscaddr, osctype]);
  osclen = osc.toIntegerBuffer(oscmessage.length);
  buffer = osc.concat([oscbundle, osctimetag, osclen, oscmessage]);
  translate = osc.fromOscBundle(buffer);
  assert.deepEqual(translate != null ? translate.timetag : void 0, timetag);
  assert.strictEqual(
    translate != null
      ? (ref = translate.elements) != null
        ? ref.length
        : void 0
      : void 0,
    1
  );
  return assert.strictEqual(
    translate != null
      ? (ref1 = translate.elements) != null
        ? (ref2 = ref1[0]) != null
          ? ref2.address
          : void 0
        : void 0
      : void 0,
    "/addr"
  );
});

test("fromOscBundle works with multiple messages", function () {
  var buffer,
    oscaddr1,
    oscaddr2,
    oscbundle,
    osclen1,
    osclen2,
    oscmessage1,
    oscmessage2,
    osctimetag,
    osctype1,
    osctype2,
    ref,
    ref1,
    ref2,
    ref3,
    ref4,
    timetag,
    translate;
  oscbundle = osc.toOscString("#bundle");
  timetag = [0, 0];
  osctimetag = osc.toTimetagBuffer(timetag);
  oscaddr1 = osc.toOscString("/addr");
  osctype1 = osc.toOscString(",");
  oscmessage1 = osc.concat([oscaddr1, osctype1]);
  osclen1 = osc.toIntegerBuffer(oscmessage1.length);
  oscaddr2 = osc.toOscString("/addr2");
  osctype2 = osc.toOscString(",");
  oscmessage2 = osc.concat([oscaddr2, osctype2]);
  osclen2 = osc.toIntegerBuffer(oscmessage2.length);
  buffer = osc.concat([
    oscbundle,
    osctimetag,
    osclen1,
    oscmessage1,
    osclen2,
    oscmessage2,
  ]);
  translate = osc.fromOscBundle(buffer);
  assert.deepEqual(translate != null ? translate.timetag : void 0, timetag);
  assert.strictEqual(
    translate != null
      ? (ref = translate.elements) != null
        ? ref.length
        : void 0
      : void 0,
    2
  );
  assert.strictEqual(
    translate != null
      ? (ref1 = translate.elements) != null
        ? (ref2 = ref1[0]) != null
          ? ref2.address
          : void 0
        : void 0
      : void 0,
    "/addr"
  );
  return assert.strictEqual(
    translate != null
      ? (ref3 = translate.elements) != null
        ? (ref4 = ref3[1]) != null
          ? ref4.address
          : void 0
        : void 0
      : void 0,
    "/addr2"
  );
});

test("fromOscBundle works with nested bundles", function () {
  var buffer,
    oscaddr1,
    oscbundle,
    oscbundle2,
    osclen1,
    osclen2,
    oscmessage1,
    oscmessage2,
    osctimetag,
    osctimetag2,
    osctype1,
    ref,
    ref1,
    ref2,
    ref3,
    ref4,
    timetag,
    timetag2,
    translate;
  oscbundle = osc.toOscString("#bundle");
  timetag = [0, 0];
  osctimetag = osc.toTimetagBuffer(timetag);
  oscaddr1 = osc.toOscString("/addr");
  osctype1 = osc.toOscString(",");
  oscmessage1 = osc.concat([oscaddr1, osctype1]);
  osclen1 = osc.toIntegerBuffer(oscmessage1.length);
  oscbundle2 = osc.toOscString("#bundle");
  timetag2 = [0, 0];
  osctimetag2 = osc.toTimetagBuffer(timetag2);
  oscmessage2 = osc.concat([oscbundle2, osctimetag2]);
  osclen2 = osc.toIntegerBuffer(oscmessage2.length);
  buffer = osc.concat([
    oscbundle,
    osctimetag,
    osclen1,
    oscmessage1,
    osclen2,
    oscmessage2,
  ]);
  translate = osc.fromOscBundle(buffer);
  assert.deepEqual(translate != null ? translate.timetag : void 0, timetag);
  assert.strictEqual(
    translate != null
      ? (ref = translate.elements) != null
        ? ref.length
        : void 0
      : void 0,
    2
  );
  assert.strictEqual(
    translate != null
      ? (ref1 = translate.elements) != null
        ? (ref2 = ref1[0]) != null
          ? ref2.address
          : void 0
        : void 0
      : void 0,
    "/addr"
  );
  return assert.deepEqual(
    translate != null
      ? (ref3 = translate.elements) != null
        ? (ref4 = ref3[1]) != null
          ? ref4.timetag
          : void 0
        : void 0
      : void 0,
    timetag2
  );
});

test("fromOscBundle works with non-understood messages", function () {
  var buffer,
    oscaddr1,
    oscaddr2,
    oscbundle,
    osclen1,
    osclen2,
    oscmessage1,
    oscmessage2,
    osctimetag,
    osctype1,
    osctype2,
    ref,
    ref1,
    ref2,
    timetag,
    translate;
  oscbundle = osc.toOscString("#bundle");
  timetag = [0, 0];
  osctimetag = osc.toTimetagBuffer(timetag);
  oscaddr1 = osc.toOscString("/addr");
  osctype1 = osc.toOscString(",");
  oscmessage1 = osc.concat([oscaddr1, osctype1]);
  osclen1 = osc.toIntegerBuffer(oscmessage1.length);
  oscaddr2 = osc.toOscString("/addr2");
  osctype2 = osc.toOscString(",α");
  oscmessage2 = osc.concat([oscaddr2, osctype2]);
  osclen2 = osc.toIntegerBuffer(oscmessage2.length);
  buffer = osc.concat([
    oscbundle,
    osctimetag,
    osclen1,
    oscmessage1,
    osclen2,
    oscmessage2,
  ]);
  translate = osc.fromOscBundle(buffer);
  assert.deepEqual(translate != null ? translate.timetag : void 0, timetag);
  assert.strictEqual(
    translate != null
      ? (ref = translate.elements) != null
        ? ref.length
        : void 0
      : void 0,
    1
  );
  return assert.strictEqual(
    translate != null
      ? (ref1 = translate.elements) != null
        ? (ref2 = ref1[0]) != null
          ? ref2.address
          : void 0
        : void 0
      : void 0,
    "/addr"
  );
});

test("fromOscBundle fails with bad bundle ID", function () {
  var oscbundle;
  oscbundle = osc.toOscString("#blunder");
  return assert.throws(function () {
    return osc.fromOscBundle(oscbundle);
  });
});

test("fromOscBundle fails with ridiculous sizes", function () {
  var oscbundle, timetag;
  timetag = [0, 0];
  oscbundle = osc.concat([
    osc.toOscString("#bundle"),
    osc.toTimetagBuffer(timetag),
    osc.toIntegerBuffer(999999),
  ]);
  return assert.throws(function () {
    return osc.fromOscBundle(oscbundle);
  });
});

roundTripMessage = function (args) {
  var comp,
    i,
    j,
    k,
    oscMessage,
    ref,
    ref1,
    ref2,
    ref3,
    ref4,
    ref5,
    ref6,
    ref7,
    roundTrip;
  oscMessage = {
    address: "/addr",
    args: args,
  };
  roundTrip = osc.fromOscMessage(osc.toOscMessage(oscMessage), true);
  assert.strictEqual(roundTrip != null ? roundTrip.address : void 0, "/addr");
  assert.strictEqual(
    roundTrip != null
      ? (ref = roundTrip.args) != null
        ? ref.length
        : void 0
      : void 0,
    args.length
  );
  for (
    i = k = 0, ref1 = args.length;
    0 <= ref1 ? k < ref1 : k > ref1;
    i = 0 <= ref1 ? ++k : --k
  ) {
    comp =
      ((ref2 = args[i]) != null ? ref2.value : void 0) != null
        ? args[i].value
        : args[i];
    if (((ref3 = args[i]) != null ? ref3.type : void 0) != null) {
      assert.strictEqual(
        roundTrip != null
          ? (ref4 = roundTrip.args) != null
            ? (ref5 = ref4[i]) != null
              ? ref5.type
              : void 0
            : void 0
          : void 0,
        args[i].type
      );
    }
    if (Buffer.isBuffer(comp)) {
      var l, ref6, ref7, ref8, ref9;
      for (
        j = l = 0, ref6 = comp.length;
        0 <= ref6 ? l < ref6 : l > ref6;
        j = 0 <= ref6 ? ++l : --l
      ) {
        assert.deepEqual(
          roundTrip != null
            ? (ref7 = roundTrip.args) != null
              ? (ref8 = ref7[i]) != null
                ? (ref9 = ref8.value) != null
                  ? ref9[j]
                  : void 0
                : void 0
              : void 0
            : void 0,
          comp[j]
        );
      }
    } else {
      assert.deepEqual(
        roundTrip != null
          ? (ref6 = roundTrip.args) != null
            ? (ref7 = ref6[i]) != null
              ? ref7.value
              : void 0
            : void 0
          : void 0,
        comp
      );
    }
  }
};

test("toOscArgument fails when given bogus type", function () {
  return assert.throws(function () {
    return osc.toOscArgument("bleh", "bogus");
  });
});

test("toOscMessage with no args works", function () {
  return roundTripMessage([]);
});

test("toOscMessage strict with null argument throws", function () {
  return assert.throws(function () {
    return osc.toOscMessage(
      {
        address: "/addr",
        args: [null],
      },
      true
    );
  });
});

test("toOscMessage with string argument works", function () {
  return roundTripMessage(["strr"]);
});

test("toOscMessage with empty array argument works", function () {
  return roundTripMessage([[]]);
});

test("toOscMessage with array value works", function () {
  return roundTripMessage([
    {
      value: [],
    },
  ]);
});

test("toOscMessage with string array argument works", function () {
  return roundTripMessage([
    [
      {
        type: "string",
        value: "hello",
      },
      {
        type: "string",
        value: "goodbye",
      },
    ],
  ]);
});

test("toOscMessage with multi-type array argument works", function () {
  return roundTripMessage([
    [
      {
        type: "string",
        value: "hello",
      },
      {
        type: "integer",
        value: 7,
      },
    ],
  ]);
});

test("toOscMessage with nested array argument works", function () {
  return roundTripMessage([
    [
      {
        type: "array",
        value: [
          {
            type: "string",
            value: "hello",
          },
        ],
      },
    ],
  ]);
});

buffeq = function (buff, exp_buff) {
  var i, k, ref;
  assert.strictEqual(buff.length, exp_buff.length);
  for (
    i = k = 0, ref = exp_buff.length;
    0 <= ref ? k < ref : k > ref;
    i = 0 <= ref ? ++k : --k
  ) {
    assert.equal(buff[i], exp_buff[i]);
  }
};

test("toOscMessage with bad layout works", function () {
  var oscMessage, ref, ref1, ref2, roundTrip;
  oscMessage = {
    address: "/addr",
    args: ["strr"],
  };
  roundTrip = osc.fromOscMessage(osc.toOscMessage(oscMessage), true);
  assert.strictEqual(roundTrip != null ? roundTrip.address : void 0, "/addr");
  assert.strictEqual(
    roundTrip != null
      ? (ref = roundTrip.args) != null
        ? ref.length
        : void 0
      : void 0,
    1
  );
  return assert.strictEqual(
    roundTrip != null
      ? (ref1 = roundTrip.args) != null
        ? (ref2 = ref1[0]) != null
          ? ref2.value
          : void 0
        : void 0
      : void 0,
    "strr"
  );
});

test("toOscMessage with single numeric argument works", function () {
  var oscMessage, ref, ref1, ref2, ref3, ref4, roundTrip;
  oscMessage = {
    address: "/addr",
    args: 13,
  };
  roundTrip = osc.fromOscMessage(osc.toOscMessage(oscMessage));
  assert.strictEqual(roundTrip != null ? roundTrip.address : void 0, "/addr");
  assert.strictEqual(
    roundTrip != null
      ? (ref = roundTrip.args) != null
        ? ref.length
        : void 0
      : void 0,
    1
  );
  assert.strictEqual(
    roundTrip != null
      ? (ref1 = roundTrip.args) != null
        ? (ref2 = ref1[0]) != null
          ? ref2.value
          : void 0
        : void 0
      : void 0,
    13
  );
  return assert.strictEqual(
    roundTrip != null
      ? (ref3 = roundTrip.args) != null
        ? (ref4 = ref3[0]) != null
          ? ref4.type
          : void 0
        : void 0
      : void 0,
    "float"
  );
});

test("toOscMessage with args shortcut works", function () {
  var oscMessage, ref, ref1, ref2, ref3, ref4, roundTrip;
  oscMessage = {
    address: "/addr",
    args: 13,
  };
  roundTrip = osc.fromOscMessage(osc.toOscMessage(oscMessage));
  assert.strictEqual(roundTrip != null ? roundTrip.address : void 0, "/addr");
  assert.strictEqual(
    roundTrip != null
      ? (ref = roundTrip.args) != null
        ? ref.length
        : void 0
      : void 0,
    1
  );
  assert.strictEqual(
    roundTrip != null
      ? (ref1 = roundTrip.args) != null
        ? (ref2 = ref1[0]) != null
          ? ref2.value
          : void 0
        : void 0
      : void 0,
    13
  );
  return assert.strictEqual(
    roundTrip != null
      ? (ref3 = roundTrip.args) != null
        ? (ref4 = ref3[0]) != null
          ? ref4.type
          : void 0
        : void 0
      : void 0,
    "float"
  );
});

test("toOscMessage with single blob argument works", function () {
  var buff, oscMessage, ref, ref1, ref2, ref3, ref4, roundTrip;
  buff = new Buffer(18);
  oscMessage = {
    address: "/addr",
    args: buff,
  };
  roundTrip = osc.fromOscMessage(osc.toOscMessage(oscMessage));
  assert.strictEqual(roundTrip != null ? roundTrip.address : void 0, "/addr");
  assert.strictEqual(
    roundTrip != null
      ? (ref = roundTrip.args) != null
        ? ref.length
        : void 0
      : void 0,
    1
  );
  buffeq(
    roundTrip != null
      ? (ref1 = roundTrip.args) != null
        ? (ref2 = ref1[0]) != null
          ? ref2.value
          : void 0
        : void 0
      : void 0,
    buff
  );
  return assert.strictEqual(
    roundTrip != null
      ? (ref3 = roundTrip.args) != null
        ? (ref4 = ref3[0]) != null
          ? ref4.type
          : void 0
        : void 0
      : void 0,
    "blob"
  );
});

test("toOscMessage with single string argument works", function () {
  var oscMessage, ref, ref1, ref2, ref3, ref4, roundTrip;
  oscMessage = {
    address: "/addr",
    args: "strr",
  };
  roundTrip = osc.fromOscMessage(osc.toOscMessage(oscMessage));
  assert.strictEqual(roundTrip != null ? roundTrip.address : void 0, "/addr");
  assert.strictEqual(
    roundTrip != null
      ? (ref = roundTrip.args) != null
        ? ref.length
        : void 0
      : void 0,
    1
  );
  assert.strictEqual(
    roundTrip != null
      ? (ref1 = roundTrip.args) != null
        ? (ref2 = ref1[0]) != null
          ? ref2.value
          : void 0
        : void 0
      : void 0,
    "strr"
  );
  return assert.strictEqual(
    roundTrip != null
      ? (ref3 = roundTrip.args) != null
        ? (ref4 = ref3[0]) != null
          ? ref4.type
          : void 0
        : void 0
      : void 0,
    "string"
  );
});

test("toOscMessage with integer argument works", function () {
  return roundTripMessage([8]);
});

test("toOscMessage with buffer argument works", function () {
  return roundTripMessage([new Buffer(16)]);
});

test("toOscMessage strict with type true and value false throws", function () {
  return assert.throws(function () {
    return osc.toOscMessage(
      {
        address: "/addr/",
        args: {
          type: "true",
          value: false,
        },
      },
      true
    );
  });
});

test("toOscMessage strict with type false with value true throws", function () {
  return assert.throws(function () {
    return osc.toOscMessage(
      {
        address: "/addr/",
        args: {
          type: "false",
          value: true,
        },
      },
      true
    );
  });
});

test("toOscMessage with type true works", function () {
  var roundTrip;
  roundTrip = osc.fromOscMessage(
    osc.toOscMessage({
      address: "/addr",
      args: true,
    })
  );
  assert.strictEqual(roundTrip.args.length, 1);
  assert.strictEqual(roundTrip.args[0].value, true);
  return assert.strictEqual(roundTrip.args[0].type, "true");
});

test("toOscMessage with type false works", function () {
  var roundTrip;
  roundTrip = osc.fromOscMessage(
    osc.toOscMessage({
      address: "/addr",
      args: false,
    })
  );
  assert.strictEqual(roundTrip.args.length, 1);
  assert.strictEqual(roundTrip.args[0].value, false);
  return assert.strictEqual(roundTrip.args[0].type, "false");
});

test("toOscMessage with type bang argument works", function () {
  var roundTrip;
  roundTrip = osc.fromOscMessage(
    osc.toOscMessage({
      address: "/addr",
      args: {
        type: "bang",
      },
    })
  );
  assert.strictEqual(roundTrip.args.length, 1);
  assert.strictEqual(roundTrip.args[0].value, "bang");
  return assert.strictEqual(roundTrip.args[0].type, "bang");
});

test("toOscMessage with type timetag argument works", function () {
  return roundTripMessage([
    {
      type: "timetag",
      value: [8888, 9999],
    },
  ]);
});

test("toOscMessage with type double argument works", function () {
  return roundTripMessage([
    {
      type: "double",
      value: 8888,
    },
  ]);
});

test("toOscMessage strict with type null with value true throws", function () {
  return assert.throws(function () {
    return osc.toOscMessage(
      {
        address: "/addr/",
        args: {
          type: "null",
          value: true,
        },
      },
      true
    );
  });
});

test("toOscMessage with type null works", function () {
  var roundTrip;
  roundTrip = osc.fromOscMessage(
    osc.toOscMessage({
      address: "/addr",
      args: null,
    })
  );
  assert.strictEqual(roundTrip.args.length, 1);
  assert.strictEqual(roundTrip.args[0].value, null);
  return assert.strictEqual(roundTrip.args[0].type, "null");
});

test("toOscMessage with float argument works", function () {
  return roundTripMessage([
    {
      value: 6,
      type: "float",
    },
  ]);
});

test("toOscMessage just a string works", function () {
  var message;
  message = osc.fromOscMessage(osc.toOscMessage("bleh"));
  assert.strictEqual(message.address, "bleh");
  return assert.strictEqual(message.args.length, 0);
});

test("toOscMessage with multiple args works", function () {
  return roundTripMessage(["str", 7, new Buffer(30), 6]);
});

test("toOscMessage with integer argument works", function () {
  return roundTripMessage([
    {
      value: 7,
      type: "integer",
    },
  ]);
});

test("toOscMessage fails with no address", function () {
  return assert.throws(function () {
    return osc.toOscMessage({
      args: [],
    });
  });
});

toOscMessageThrowsHelper = function (arg) {
  return assert.throws(function () {
    return osc.toOscMessage({
      address: "/addr",
      args: [arg],
    });
  });
};

test("toOscMessage fails when string type is specified but wrong", function () {
  return toOscMessageThrowsHelper({
    value: 7,
    type: "string",
  });
});

test("toOscMessage fails when integer type is specified but wrong", function () {
  return toOscMessageThrowsHelper({
    value: "blah blah",
    type: "integer",
  });
});

test("toOscMessage fails when float type is specified but wrong", function () {
  return toOscMessageThrowsHelper({
    value: "blah blah",
    type: "float",
  });
});

test("toOscMessage fails when timetag type is specified but wrong", function () {
  return toOscMessageThrowsHelper({
    value: "blah blah",
    type: "timetag",
  });
});

test("toOscMessage fails when double type is specified but wrong", function () {
  return toOscMessageThrowsHelper({
    value: "blah blah",
    type: "double",
  });
});

test("toOscMessage fails when blob type is specified but wrong", function () {
  return toOscMessageThrowsHelper({
    value: "blah blah",
    type: "blob",
  });
});

test("toOscMessage fails argument is a random type", function () {
  return toOscMessageThrowsHelper({
    random_field: 42,
    "is pretty random": 888,
  });
});

roundTripBundle = function (elems) {
  var i,
    k,
    length,
    oscMessage,
    ref,
    ref1,
    ref2,
    ref3,
    ref4,
    ref5,
    ref6,
    ref7,
    roundTrip;
  oscMessage = {
    timetag: [0, 0],
    elements: elems,
  };
  roundTrip = osc.fromOscBundle(osc.toOscBundle(oscMessage), true);
  assert.deepEqual(roundTrip != null ? roundTrip.timetag : void 0, [0, 0]);
  length = typeof elems === "object" ? elems.length : 1;
  assert.strictEqual(
    roundTrip != null
      ? (ref = roundTrip.elements) != null
        ? ref.length
        : void 0
      : void 0,
    length
  );
  for (
    i = k = 0, ref1 = length;
    0 <= ref1 ? k < ref1 : k > ref1;
    i = 0 <= ref1 ? ++k : --k
  ) {
    if (typeof elems === "object") {
      assert.deepEqual(
        roundTrip != null
          ? (ref2 = roundTrip.elements) != null
            ? (ref3 = ref2[i]) != null
              ? ref3.timetag
              : void 0
            : void 0
          : void 0,
        elems[i].timetag
      );
      assert.strictEqual(
        roundTrip != null
          ? (ref4 = roundTrip.elements) != null
            ? (ref5 = ref4[i]) != null
              ? ref5.address
              : void 0
            : void 0
          : void 0,
        elems[i].address
      );
    } else {
      assert.strictEqual(
        roundTrip != null
          ? (ref6 = roundTrip.elements) != null
            ? (ref7 = ref6[i]) != null
              ? ref7.address
              : void 0
            : void 0
          : void 0,
        elems
      );
    }
  }
};

test("toOscBundle with no elements works", function () {
  return roundTripBundle([]);
});

test("toOscBundle with just a string works", function () {
  return roundTripBundle("/address");
});

test("toOscBundle with just a number fails", function () {
  return assert.throws(function () {
    return roundTripBundle(78);
  });
});

test("toOscBundle with one message works", function () {
  return roundTripBundle([
    {
      address: "/addr",
    },
  ]);
});

test("toOscBundle with nested bundles works", function () {
  return roundTripBundle([
    {
      address: "/addr",
    },
    {
      timetag: [8888, 9999],
    },
  ]);
});

test("toOscBundle with bogus packets works", function () {
  var roundTrip;
  roundTrip = osc.fromOscBundle(
    osc.toOscBundle({
      timetag: [0, 0],
      elements: [
        {
          timetag: [0, 0],
        },
        {
          maddress: "/addr",
        },
      ],
    })
  );
  assert.strictEqual(roundTrip.elements.length, 1);
  return assert.deepEqual(roundTrip.elements[0].timetag, [0, 0]);
});

test("toOscBundle strict fails without timetags", function () {
  return assert.throws(function () {
    return osc.toOscBundle(
      {
        elements: [],
      },
      true
    );
  });
});

test("identity applyTransform works with single message", function () {
  var testBuffer;
  testBuffer = osc.toOscString("/message");
  return assert.strictEqual(
    osc.applyTransform(testBuffer, function (a) {
      return a;
    }),
    testBuffer
  );
});

test("nullary applyTransform works with single message", function () {
  var testBuffer;
  testBuffer = osc.toOscString("/message");
  return assert.strictEqual(
    osc.applyTransform(testBuffer, function (a) {
      return new Buffer(0);
    }).length,
    0
  );
});

test("toOscPacket works when explicitly set to bundle", function () {
  var roundTrip;
  roundTrip = osc.fromOscBundle(
    osc.toOscPacket(
      {
        timetag: 0,
        oscType: "bundle",
        elements: [],
      },
      true
    )
  );
  return assert.strictEqual(roundTrip.elements.length, 0);
});

test("toOscPacket works when explicitly set to message", function () {
  var roundTrip;
  roundTrip = osc.fromOscPacket(
    osc.toOscPacket(
      {
        address: "/bleh",
        oscType: "message",
        args: [],
      },
      true
    )
  );
  assert.strictEqual(roundTrip.args.length, 0);
  return assert.strictEqual(roundTrip.address, "/bleh");
});

test("identity applyTransform works with a simple bundle", function () {
  var base, i, k, ref, ref1, ref2, ref3, ref4, ref5, transformed;
  base = {
    timetag: [0, 0],
    elements: [
      {
        address: "test1",
      },
      {
        address: "test2",
      },
    ],
  };
  transformed = osc.fromOscPacket(
    osc.applyTransform(osc.toOscPacket(base), function (a) {
      return a;
    })
  );
  assert.deepEqual(transformed != null ? transformed.timetag : void 0, [0, 0]);
  assert.strictEqual(
    transformed != null
      ? (ref = transformed.elements) != null
        ? ref.length
        : void 0
      : void 0,
    base.elements.length
  );
  for (
    i = k = 0, ref1 = base.elements.length;
    0 <= ref1 ? k < ref1 : k > ref1;
    i = 0 <= ref1 ? ++k : --k
  ) {
    assert.equal(
      transformed != null
        ? (ref2 = transformed.elements) != null
          ? (ref3 = ref2[i]) != null
            ? ref3.timetag
            : void 0
          : void 0
        : void 0,
      base.elements[i].timetag
    );
    assert.strictEqual(
      transformed != null
        ? (ref4 = transformed.elements) != null
          ? (ref5 = ref4[i]) != null
            ? ref5.address
            : void 0
          : void 0
        : void 0,
      base.elements[i].address
    );
  }
});

test("applyMessageTranformerToBundle fails on bundle without tag", function () {
  var func;
  func = osc.applyMessageTranformerToBundle(function (a) {
    return a;
  });
  return assert.throws(function () {
    return func(
      osc.concat([osc.toOscString("#grundle", osc.toIntegerBuffer(0, "Int64"))])
    );
  });
});

test("addressTransform works with identity", function () {
  var i, k, ref, testBuffer, transformed;
  testBuffer = osc.concat([
    osc.toOscString("/message"),
    new Buffer("gobblegobblewillsnever\u0000parse blah lbha"),
  ]);
  transformed = osc.applyTransform(
    testBuffer,
    osc.addressTransform(function (a) {
      return a;
    })
  );
  for (
    i = k = 0, ref = testBuffer.length;
    0 <= ref ? k < ref : k > ref;
    i = 0 <= ref ? ++k : --k
  ) {
    assert.equal(transformed[i], testBuffer[i]);
  }
});

test("addressTransform works with bundles", function () {
  var base, i, k, ref, ref1, ref2, ref3, ref4, ref5, transformed;
  base = {
    timetag: [0, 0],
    elements: [
      {
        address: "test1",
      },
      {
        address: "test2",
      },
    ],
  };
  transformed = osc.fromOscPacket(
    osc.applyTransform(
      osc.toOscPacket(base),
      osc.addressTransform(function (a) {
        return "/prelude/" + a;
      })
    )
  );
  assert.deepEqual(transformed != null ? transformed.timetag : void 0, [0, 0]);
  assert.strictEqual(
    transformed != null
      ? (ref = transformed.elements) != null
        ? ref.length
        : void 0
      : void 0,
    base.elements.length
  );
  for (
    i = k = 0, ref1 = base.elements.length;
    0 <= ref1 ? k < ref1 : k > ref1;
    i = 0 <= ref1 ? ++k : --k
  ) {
    assert.equal(
      transformed != null
        ? (ref2 = transformed.elements) != null
          ? (ref3 = ref2[i]) != null
            ? ref3.timetag
            : void 0
          : void 0
        : void 0,
      base.elements[i].timetag
    );
    assert.strictEqual(
      transformed != null
        ? (ref4 = transformed.elements) != null
          ? (ref5 = ref4[i]) != null
            ? ref5.address
            : void 0
          : void 0
        : void 0,
      "/prelude/" + base.elements[i].address
    );
  }
});

test("messageTransform works with identity function for single message", function () {
  var buff, message;
  message = {
    address: "/addr",
    args: [],
  };
  buff = osc.toOscPacket(message);
  return buffeq(
    osc.applyTransform(
      buff,
      osc.messageTransform(function (a) {
        return a;
      })
    ),
    buff
  );
});

test("messageTransform works with bundles", function () {
  var buff, message;
  message = {
    timetag: [0, 0],
    elements: [
      {
        address: "test1",
      },
      {
        address: "test2",
      },
    ],
  };
  buff = osc.toOscPacket(message);
  return buffeq(
    osc.applyTransform(
      buff,
      osc.messageTransform(function (a) {
        return a;
      })
    ),
    buff
  );
});

test("toTimetagBuffer works with a delta number", function () {
  var buf, delta;
  delta = 1.2345;
  buf = osc.toTimetagBuffer(delta);
});

assertDatesEqual = function (date1, date2) {
  return assert(
    Math.abs(date1.getTime() - date2.getTime()) <= 1,
    "" + date1 + " != " + date2
  );
};

test("toTimetagBuffer works with a Date", function () {
  var buf, date;
  date = new Date();
  buf = osc.toTimetagBuffer(date);
});

test("toTimetagBuffer works with a timetag array", function () {
  var buf, timetag;
  timetag = [1000, 10001];
  buf = osc.toTimetagBuffer(timetag);
});

test("toTimetagBuffer throws with invalid", function () {
  assert.throws(function () {
    return osc.toTimetagBuffer("some bullshit");
  });
});

test("deltaTimetag makes array from a delta", function () {
  var delta, ntp;
  delta = 1.2345;
  ntp = osc.deltaTimetag(delta);
});

test("timetagToDate converts timetag to a Date", function () {
  var date, date2, timetag;
  date = new Date();
  timetag = osc.dateToTimetag(date);
  date2 = osc.timetagToDate(timetag);
  return assertDatesEqual(date, date2);
});

test("timestampToTimetag converts a unix time to ntp array", function () {
  var date, date2, timetag;
  date = new Date();
  timetag = osc.timestampToTimetag(date.getTime() / 1000);
  date2 = osc.timetagToDate(timetag);
  return assertDatesEqual(date, date2);
});

test("dateToTimetag converts date to ntp array", function () {
  var date, date2, timetag;
  date = new Date();
  timetag = osc.dateToTimetag(date);
  date2 = osc.timetagToDate(timetag);
  return assertDatesEqual(date, date2);
});

test("timestamp <-> timeTag round trip", function () {
  var near, now;
  now = new Date().getTime() / 1000;
  near = function (a, b) {
    return Math.abs(a - b) < 1e-6;
  };
  return assert(near(osc.timetagToTimestamp(osc.timestampToTimetag(now)), now));
});

test("splitTimetag returns timetag from a buffer", function () {
  var buf, ref, rest, rest2, timetag, timetag2;
  timetag = [1000, 1001];
  rest = "the rest";
  buf = osc.concat([osc.toTimetagBuffer(timetag), new Buffer(rest)]);
  (ref = osc.splitTimetag(buf)), (timetag2 = ref.timetag), (rest2 = ref.rest);
  return assert.deepEqual(timetag2, timetag);
});
