import * as osc from "../lib/osc-utilities";
import * as assert from "assert";

const testString = function (str, expected_len) {
  return {
    str: str,
    len: expected_len,
  };
};

const testData = [
  testString("abc", 4),
  testString("abcd", 8),
  testString("abcde", 8),
  testString("abcdef", 8),
  testString("abcdefg", 8),
];

const testStringLength = function (str, expected_len) {
  const oscstr = osc.toOscString(str);
  assert.strictEqual(oscstr.byteLength, expected_len);
};

test("basic strings length", function () {
  var data, k, len;
  for (k = 0, len = testData.length; k < len; k++) {
    data = testData[k];
    testStringLength(data.str, data.len);
  }
});

const testStringRoundTrip = function (str) {
  assert.strictEqual(str, osc.splitOscString(osc.toOscString(str)).value);
};

test("basic strings round trip", function () {
  var data, k, len;
  for (k = 0, len = testData.length; k < len; k++) {
    data = testData[k];
    testStringRoundTrip(data.str);
  }
});

test("strings with null characters fail toOscString", function () {
  assert.throws(function () {
    osc.toOscString("\u0000");
  });
});

test("osc buffers with no null characters fail splitOscString", function () {
  assert.throws(function () {
    osc.splitOscString(new TextEncoder().encode("abc"));
  });
});

test("osc buffers with non-null characters after a null character fail fromOscMessage in mode", function () {
  assert.throws(function () {
    osc.fromOscMessage(new TextEncoder().encode("abc\u0000abcd"));
  });
});

test("basic strings pass fromOscString in mode", function () {
  var data, k, len;
  for (k = 0, len = testData.length; k < len; k++) {
    data = testData[k];
    testStringRoundTrip(data.str);
  }
});

test("osc buffers with non-four length fail in mode", function () {
  assert.throws(function () {
    osc.fromOscMessage(new TextEncoder().encode("abcd\u0000\u0000"));
  });
});

test("splitOscString of an osc-string matches the string", function () {
  const { value, rest } = osc.splitOscString(osc.toOscString("testing it"));
  assert.strictEqual(value, "testing it");
  assert.strictEqual(rest.byteLength, 0);
});

test("splitOscString works with an over-allocated buffer", function () {
  const overallocated = new ArrayBuffer(16);
  new Uint8Array(overallocated).set(
    new Uint8Array(osc.toOscString("testing it"))
  );
  const { value, rest } = osc.splitOscString(overallocated);
  assert.strictEqual(value, "testing it");
  assert.strictEqual(rest.byteLength, 4);
});

test("splitOscString fails for just a string", function () {
  assert.throws(function () {
    osc.splitOscString(new TextEncoder().encode("testing it"));
  });
});

test("splitOscString fails for string with not enough padding", function () {
  assert.throws(function () {
    osc.splitOscString(new TextEncoder().encode("testing \u0000\u0000"));
  });
});

test("splitOscString succeeds for strings with valid padding", function () {
  const { value, rest } = osc.splitOscString(
    new TextEncoder().encode("testing it\u0000\u0000aaaa")
  );
  assert.strictEqual(value, "testing it");
  assert.strictEqual(rest.byteLength, 4);
});

test("splitOscString fails for string with invalid padding", function () {
  assert.throws(function () {
    osc.splitOscString(new TextEncoder().encode("testing it\u0000aaaaa"));
  });
});

test("splitInteger fails when sent a buffer that's too small", function () {
  assert.throws(function () {
    osc.splitInteger(new ArrayBuffer(3));
  });
});

test("fromOscMessage with no type string works", function () {
  var translate;
  translate = osc.fromOscMessage(osc.toOscString("/stuff"));
  assert.strictEqual(translate != null ? translate.address : void 0, "/stuff");
  assert.deepStrictEqual(translate != null ? translate.args : void 0, []);
});

test("fromOscMessage with type string and no args works", function () {
  const oscaddr = osc.toOscString("/stuff");
  const osctype = osc.toOscString(",");
  const oscmessage = new Uint8Array(oscaddr.byteLength + osctype.byteLength);
  oscmessage.set(new Uint8Array(oscaddr));
  oscmessage.set(new Uint8Array(osctype), oscaddr.byteLength);
  const translate = osc.fromOscMessage(oscmessage);
  assert.strictEqual(translate.address, "/stuff");
  assert.deepStrictEqual(translate.args, []);
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
  assert.strictEqual(
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
  assert.strictEqual(
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
  assert.strictEqual(
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
  assert.strictEqual(
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
  assert.strictEqual(
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
  const oscaddr = osc.toOscString("/stuff");
  const osctype = osc.toOscString(",b");
  const oscarg = osc.concat([
    osc.toIntegerBuffer(4),
    new TextEncoder().encode("argu"),
  ]);
  const translate: any = osc.fromOscMessage(
    osc.concat([oscaddr, osctype, oscarg])
  );
  assert.strictEqual(translate.address, "/stuff");
  assert.strictEqual(translate.args[0].type, "blob");
  assert.strictEqual(new TextDecoder().decode(translate.args[0].value), "argu");
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
  assert.strictEqual(
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
  assert.deepStrictEqual(
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

test("fromOscMessage with mismatched array throws", function () {
  var oscaddr;
  oscaddr = osc.toOscString("/stuff");
  assert.throws(function () {
    osc.fromOscMessage(osc.concat([oscaddr, osc.toOscString(",[")]));
  });
  assert.throws(function () {
    osc.fromOscMessage(osc.concat([oscaddr, osc.toOscString(",]")]));
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
  assert.deepStrictEqual(
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
  assert.strictEqual(
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
  assert.strictEqual(
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
  assert.strictEqual(
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
    osc.concat([osc.toIntegerBuffer(4), new TextEncoder().encode("argu")]),
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
  assert.strictEqual(
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

test("fromOscMessage fails if type string has no comma", function () {
  var oscaddr, osctype;
  oscaddr = osc.toOscString("/stuff");
  osctype = osc.toOscString("fake");
  assert.throws(function () {
    osc.fromOscMessage(osc.concat([oscaddr, osctype]));
  });
});

test("fromOscMessage fails if type address doesn't begin with /", function () {
  var oscaddr, osctype;
  oscaddr = osc.toOscString("stuff");
  osctype = osc.toOscString(",");
  assert.throws(function () {
    osc.fromOscMessage(osc.concat([oscaddr, osctype]));
  });
});

test("fromOscBundle works with no messages", function () {
  var buffer, oscbundle, osctimetag, timetag, translate;
  oscbundle = osc.toOscString("#bundle");
  timetag = [0, 0];
  osctimetag = osc.toTimetagBuffer(timetag);
  buffer = osc.concat([oscbundle, osctimetag]);
  translate = osc.fromOscBundle(buffer);
  assert.deepStrictEqual(
    translate != null ? translate.timetag : void 0,
    timetag
  );
  assert.deepStrictEqual(translate != null ? translate.elements : void 0, []);
});

test("fromOscBundle works with single message", function () {
  const oscbundle = osc.toOscString("#bundle");
  const timetag: osc.TimeTag = [0, 0];
  const osctimetag = osc.toTimetagBuffer(timetag);
  const oscaddr = osc.toOscString("/addr");
  const osctype = osc.toOscString(",");
  const oscmessage = osc.concat([oscaddr, osctype]);
  const osclen = osc.toIntegerBuffer(oscmessage.byteLength);
  const buffer = osc.concat([oscbundle, osctimetag, osclen, oscmessage]);
  const translate: any = osc.fromOscBundle(buffer);
  assert.deepStrictEqual(translate.timetag, timetag);
  assert.strictEqual(translate.elements.length, 1);
  assert.strictEqual(translate.elements[0].address, "/addr");
});

test("fromOscBundle works with multiple messages", function () {
  const oscbundle = osc.toOscString("#bundle");
  const timetag: osc.TimeTag = [0, 0];
  const osctimetag = osc.toTimetagBuffer(timetag);
  const oscaddr1 = osc.toOscString("/addr");
  const osctype1 = osc.toOscString(",");
  const oscmessage1 = osc.concat([oscaddr1, osctype1]);
  const osclen1 = osc.toIntegerBuffer(oscmessage1.byteLength);
  const oscaddr2 = osc.toOscString("/addr2");
  const osctype2 = osc.toOscString(",");
  const oscmessage2 = osc.concat([oscaddr2, osctype2]);
  const osclen2 = osc.toIntegerBuffer(oscmessage2.byteLength);
  const buffer = osc.concat([
    oscbundle,
    osctimetag,
    osclen1,
    oscmessage1,
    osclen2,
    oscmessage2,
  ]);
  const translate: any = osc.fromOscBundle(buffer);
  assert.deepStrictEqual(translate.timetag, timetag);
  assert.strictEqual(translate.elements.length, 2);
  assert.strictEqual(translate.elements[0].address, "/addr");
  assert.strictEqual(translate.elements[1].address, "/addr2");
});

test("fromOscBundle works with nested bundles", function () {
  const oscbundle = osc.toOscString("#bundle");
  const timetag: osc.TimeTag = [0, 0];
  const osctimetag = osc.toTimetagBuffer(timetag);
  const oscaddr1 = osc.toOscString("/addr");
  const osctype1 = osc.toOscString(",");
  const oscmessage1 = osc.concat([oscaddr1, osctype1]);
  const osclen1 = osc.toIntegerBuffer(oscmessage1.byteLength);
  const oscbundle2 = osc.toOscString("#bundle");
  const timetag2: osc.TimeTag = [0, 0];
  const osctimetag2 = osc.toTimetagBuffer(timetag2);
  const oscmessage2 = osc.concat([oscbundle2, osctimetag2]);
  const osclen2 = osc.toIntegerBuffer(oscmessage2.byteLength);
  const buffer = osc.concat([
    oscbundle,
    osctimetag,
    osclen1,
    oscmessage1,
    osclen2,
    oscmessage2,
  ]);
  const translate: any = osc.fromOscBundle(buffer);
  assert.deepStrictEqual(translate.timetag, timetag);
  assert.strictEqual(translate.elements.length, 2);
  assert.strictEqual(translate.elements[0].address, "/addr");
  assert.deepStrictEqual(translate.elements[1].timetag, timetag2);
});

test("fromOscBundle works with non-understood messages", function () {
  const oscbundle = osc.toOscString("#bundle");
  const timetag: osc.TimeTag = [0, 0];
  const osctimetag = osc.toTimetagBuffer(timetag);
  const oscaddr1 = osc.toOscString("/addr");
  const osctype1 = osc.toOscString(",");
  const oscmessage1 = osc.concat([oscaddr1, osctype1]);
  const osclen1 = osc.toIntegerBuffer(oscmessage1.byteLength);
  const oscaddr2 = osc.toOscString("/addr2");
  const osctype2 = osc.toOscString(",α");
  const oscmessage2 = osc.concat([oscaddr2, osctype2]);
  const osclen2 = osc.toIntegerBuffer(oscmessage2.byteLength);
  const buffer = osc.concat([
    oscbundle,
    osctimetag,
    osclen1,
    oscmessage1,
    osclen2,
    oscmessage2,
  ]);
  const translate: any = osc.fromOscBundle(buffer);
  assert.deepStrictEqual(translate.timetag, timetag);
  assert.strictEqual(translate.elements.length, 1);
  assert.strictEqual(translate.elements[0].address, "/addr");
});

test("fromOscBundle fails with bad bundle ID", function () {
  var oscbundle;
  oscbundle = osc.toOscString("#blunder");
  assert.throws(function () {
    osc.fromOscBundle(oscbundle);
  });
});

test("fromOscBundle fails with ridiculous sizes", function () {
  var oscbundle, timetag;
  timetag = [0, 0];
  oscbundle = osc.concat([
    osc.toOscMessage("#bundle"),
    osc.toTimetagBuffer(timetag),
    osc.toIntegerBuffer(999999),
  ]);
  assert.throws(function () {
    osc.fromOscBundle(oscbundle);
  });
});

const checkRoundTrip = function (
  args: osc.OscArgOrArrayInput[],
  roundTrips: any
) {
  assert.strictEqual(roundTrips.length, args.length);

  for (let i = 0; i < args.length; i++) {
    const arg: any = args[i];
    const roundTrip: any = roundTrips[i];
    if (arg !== null && typeof arg === "object" && "type" in arg) {
      assert.strictEqual(roundTrip.type, arg.type);
    }
    if (
      Array.isArray(arg) ||
      (arg !== null &&
        typeof arg === "object" &&
        "type" in arg &&
        arg.type === "array")
    ) {
      checkRoundTrip(Array.isArray(arg) ? arg : arg.value, roundTrip.value);
    } else if (arg !== null && typeof arg === "object" && "value" in arg) {
      assert.deepStrictEqual(roundTrip.value, arg.value);
    } else if (arg instanceof ArrayBuffer) {
      assert.deepStrictEqual(roundTrip.value, new DataView(arg));
    } else if (arg !== null && typeof arg === "object" && "buffer" in arg) {
      assert.deepStrictEqual(
        roundTrip.value,
        new DataView(arg.buffer, arg.byteOffset, arg.byteLength)
      );
    } else {
      assert.deepStrictEqual(roundTrip.value, arg);
    }
  }
};

const roundTripMessage = function (args: osc.OscArgOrArrayInput[]) {
  const oscMessage = {
    address: "/addr",
    args: args,
  };
  const roundTrip = osc.fromOscMessage(osc.toOscMessage(oscMessage));
  assert.strictEqual(roundTrip.address, "/addr");
  checkRoundTrip(args, roundTrip.args);
};

test("toOscMessage with no args works", function () {
  roundTripMessage([]);
});

test("toOscMessage with null argument", function () {
  roundTripMessage([null]);
});

test("toOscMessage with string argument works", function () {
  roundTripMessage(["strr"]);
});

test("toOscMessage with empty array argument works", function () {
  roundTripMessage([[]]);
});

test("toOscMessage with array value works", function () {
  roundTripMessage([["strr"]]);
});

test("toOscMessage with string array argument works", function () {
  roundTripMessage(["hello", "goodbye"]);
});

test("toOscMessage with multi-type array argument works", function () {
  roundTripMessage([["hello", 7]]);
});

test("toOscMessage with nested array argument works", function () {
  roundTripMessage([
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

test("toOscMessage with bad layout works", function () {
  const oscMessage = {
    address: "/addr",
    args: ["strr"],
  };
  const roundTrip: any = osc.fromOscMessage(osc.toOscMessage(oscMessage));
  assert.strictEqual(roundTrip.address, "/addr");
  assert.strictEqual(roundTrip.args.length, 1);
  assert.strictEqual(roundTrip.args[0].value, "strr");
});

test("toOscMessage with single numeric argument works", function () {
  const oscMessage = {
    address: "/addr",
    args: 13,
  };
  const roundTrip: any = osc.fromOscMessage(osc.toOscMessage(oscMessage));
  assert.strictEqual(roundTrip.address, "/addr");
  assert.strictEqual(roundTrip.args.length, 1);
  assert.strictEqual(roundTrip.args[0].value, 13);
  assert.strictEqual(roundTrip.args[0].type, "float");
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
  assert.strictEqual(
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
  const buff = new ArrayBuffer(18);
  const oscMessage = {
    address: "/addr",
    args: buff,
  };
  const roundTrip: any = osc.fromOscMessage(osc.toOscMessage(oscMessage));
  assert.strictEqual(roundTrip.address, "/addr");
  assert.strictEqual(roundTrip.args.length, 1);
  assert.strictEqual(roundTrip.args[0].type, "blob");
  assert.deepStrictEqual(roundTrip.args[0].value, new DataView(buff));
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
  assert.strictEqual(
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
  roundTripMessage([8]);
});

test("toOscMessage with buffer argument works", function () {
  roundTripMessage([new TextEncoder().encode("testing 123")]);
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
  assert.strictEqual(roundTrip.args[0].type, "true");
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
  assert.strictEqual(roundTrip.args[0].type, "false");
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
  assert.strictEqual(roundTrip.args[0].type, "bang");
});

test("toOscMessage with type timetag argument works", function () {
  roundTripMessage([
    {
      type: "timetag",
      value: [8888, 9999],
    },
  ]);
});

test("toOscMessage with type double argument works", function () {
  roundTripMessage([
    {
      type: "double",
      value: 8888,
    },
  ]);
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
  assert.strictEqual(roundTrip.args[0].type, "null");
});

test("toOscMessage with float argument works", function () {
  roundTripMessage([
    {
      value: 6,
      type: "float",
    },
  ]);
});

test("toOscMessage just a string works", function () {
  var message;
  message = osc.fromOscMessage(osc.toOscMessage("/bleh"));
  assert.strictEqual(message.address, "/bleh");
  assert.strictEqual(message.args.length, 0);
});

test("roudtrip symbol works", () => {
  roundTripMessage([
    {
      type: "symbol",
      value: "bleh",
    },
  ]);
});

test("toOscMessage with multiple args works", function () {
  roundTripMessage(["str", 7, new ArrayBuffer(30), 6]);
});

test("toOscMessage with integer argument works", function () {
  roundTripMessage([
    {
      value: 7,
      type: "integer",
    },
  ]);
});

const roundTripBundle = function (elems) {
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
  roundTrip = osc.fromOscBundle(osc.toOscBundle(oscMessage));
  assert.deepStrictEqual(
    roundTrip != null ? roundTrip.timetag : void 0,
    [0, 0]
  );
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
      assert.deepStrictEqual(
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
  roundTripBundle([]);
});

test("toOscBundle with just a string works", function () {
  roundTripBundle("/address");
});

test("toOscBundle with just a number fails", function () {
  assert.throws(function () {
    roundTripBundle(78);
  });
});

test("toOscBundle with one message works", function () {
  roundTripBundle([
    {
      address: "/addr",
    },
  ]);
});

test("toOscBundle with nested bundles works", function () {
  roundTripBundle([
    {
      address: "/addr",
    },
    {
      timetag: [8888, 9999],
    },
  ]);
});

test("identity applyTransform works with single message", function () {
  var testBuffer;
  testBuffer = osc.toOscString("/message");
  assert.deepStrictEqual(
    osc.applyTransform(testBuffer, function (a) {
      return a;
    }),
    new DataView(testBuffer)
  );
});

test("nullary applyTransform works with single message", function () {
  var testBuffer;
  testBuffer = osc.toOscString("/message");
  assert.strictEqual(
    osc.applyTransform(testBuffer, function () {
      return new DataView(new ArrayBuffer(0));
    }).byteLength,
    0
  );
});

test("toOscPacket works when explicitly set to bundle", function () {
  var roundTrip;
  roundTrip = osc.fromOscBundle(
    osc.toOscPacket({
      timetag: new Date(),
      elements: [],
    })
  );
  assert.strictEqual(roundTrip.elements.length, 0);
});

test("toOscPacket works when explicitly set to message", function () {
  var roundTrip;
  roundTrip = osc.fromOscPacket(
    osc.toOscPacket({
      address: "/bleh",
      args: [],
    })
  );
  assert.strictEqual(roundTrip.args.length, 0);
  assert.strictEqual(roundTrip.address, "/bleh");
});

test("identity applyTransform works with a simple bundle", function () {
  const base: any = {
    timetag: [0, 0],
    elements: [
      {
        address: "/test1",
      },
      {
        address: "/test2",
      },
    ],
  };
  const transformed: any = osc.fromOscPacket(
    osc.applyTransform(osc.toOscPacket(base), function (a) {
      return a;
    })
  );
  assert.deepStrictEqual(transformed.timetag, [0, 0]);
  assert.strictEqual(transformed.elements.length, base.elements.length);
  for (let i = 0; i < base.elements.length; i++) {
    assert.equal(transformed.elements[i].timetag, base.elements[i].timetag);
    assert.strictEqual(
      transformed.elements[i].address,
      base.elements[i].address
    );
  }
});

test("applyMessageTranformerToBundle fails on bundle without tag", function () {
  var func;
  func = osc.applyMessageTranformerToBundle(function (a) {
    return a;
  });
  assert.throws(function () {
    func(osc.concat([osc.toOscMessage("#grundle"), osc.toIntegerBuffer(0)]));
  });
});

test("addressTransform works with identity", function () {
  var i, k, ref, testBuffer, transformed;
  testBuffer = osc.concat([
    osc.toOscMessage("/message"),
    new TextEncoder().encode("gobblegobblewillsnever\u0000parse blah lbha"),
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
  assert.deepStrictEqual(
    transformed != null ? transformed.timetag : void 0,
    [0, 0]
  );
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
  assert.deepStrictEqual(
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
  const message: osc.OscPacketInput = {
    timetag: [0, 0],
    elements: [
      {
        address: "/test1",
      },
      {
        address: "/test2",
      },
    ],
  };
  const buff = osc.toOscPacket(message);
  assert.deepStrictEqual(
    osc.applyTransform(
      buff,
      osc.messageTransform(function (a) {
        return a;
      })
    ),
    buff
  );
});

const assertDatesEqual = function (date1, date2) {
  assert(
    Math.abs(date1.getTime() - date2.getTime()) <= 1,
    "" + date1 + " != " + date2
  );
};

test("timetagToDate converts timetag to a Date", function () {
  var date, date2, timetag;
  date = new Date();
  timetag = osc.dateToTimetag(date);
  date2 = osc.timetagToDate(timetag);
  assertDatesEqual(date, date2);
});

test("dateToTimetag converts date to ntp array", function () {
  var date, date2, timetag;
  date = new Date();
  timetag = osc.dateToTimetag(date);
  date2 = osc.timetagToDate(timetag);
  assertDatesEqual(date, date2);
});

test("splitTimetag returns timetag from a buffer", function () {
  const timetag: osc.TimeTag = [1000, 1001];
  const rest = "the rest";
  const buf = osc.concat([
    osc.toTimetagBuffer(timetag),
    new TextEncoder().encode(rest),
  ]);
  const { value: timetag2 } = osc.splitTimetag(buf);
  assert.deepStrictEqual(timetag2, timetag);
});
