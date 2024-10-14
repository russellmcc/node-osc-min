# osc-min

_simple utilities for open sound control in node.js_

This package provides some node.js utilities for working with
[OSC](http://opensoundcontrol.org/), a format for sound and systems control.  
 Here we implement the [OSC 1.1][spec11] specification. OSC is a transport-independent
protocol, so we don't provide any server objects, as you should be able to
use OSC over any transport you like. The most common is probably udp, but tcp
is not unheard of.

[spec11]: http://opensoundcontrol.org/spec-1_1

---

## Examples

Further examples available in the `examples` folder.

### A simple OSC server that prints any received messages

<!-- doc-gen CODE src="examples/printosc.mjs" lines="8-16" syntax="js" -->
```js
const sock = udp.createSocket("udp4", (msg) => {
  try {
    console.log(osc.fromBuffer(msg));
  } catch (e) {
    console.log("invalid OSC packet", e);
  }
});

sock.bind(inport);
```
<!-- end-doc-gen -->

### Send a message containing multiple arguments every 2 seconds

<!-- doc-gen CODE src="examples/oscheartbeat.mjs" lines="9-25" syntax="js" -->
```js
const sendHeartbeat = () => {
  const buf = toBuffer({
    address: "/heartbeat",
    args: [
      12,
      "sttttring",
      new TextEncoder().encode("beat"),
      {
        type: "integer",
        value: 7,
      },
    ],
  });
  return udp.send(buf, 0, buf.byteLength, outport, "localhost");
};

setInterval(sendHeartbeat, 2000);
```
<!-- end-doc-gen -->

### A simple OSC re-director

<!-- doc-gen CODE src="examples/osc-redirect.mjs" lines="10-28" syntax="js"-->
```js
const sock = dgram.createSocket("udp4", (msg) => {
  try {
    const redirected = osc.applyAddressTransform(
      msg,
      (address) => `/redirect${address}`
    );
    return sock.send(
      redirected,
      0,
      redirected.byteLength,
      outport,
      "localhost"
    );
  } catch (e) {
    return console.log(`error redirecting: ${e}`);
  }
});

sock.bind(inport);
```
<!-- end-doc-gen -->

---

## Javascript representations of the OSC types.

See the [spec][spec] for more information on the OSC types.

- An _OSC Packet_ is an _OSC Message_ or an _OSC Bundle_.

- An _OSC Message_:

       {
           oscType : "message"
           address : "/address/pattern/might/have/wildcards"
           args : [arg1,arg2]
       }

Where args is an array of _OSC Arguments_. `oscType` is optional.
`args` can be a single element.

- An _OSC Argument_ is represented as a javascript object with the following layout:

       {
           type : "string"
           value : "value"
       }

Where the `type` is one of the following:

- `string` - string value
- `float` - numeric value
- `integer` - numeric value
- `blob` - node.js Buffer value
- `true` - value is boolean true
- `false` - value is boolean false
- `null` - no value
- `bang` - no value (this is the `I` type tag)
- `timetag` - Javascript `Date`
- `array` - array of _OSC Arguments_

Note that `type` is always a string - i.e. `"true"` rather than `true`.

The following non-standard types are also supported:

- `double` - numeric value (encodes to a float64 value)

For messages sent to the `toBuffer` function, `type` is optional.
If the argument is not an object, it will be interpreted as either
`string`, `float`, `array` or `blob`, depending on its javascript type
(String, Number, Array, Buffer, respectively)

- An _OSC Bundle_ is represented as a javascript object with the following fields:

       {
           oscType : "bundle"
           timetag : 7
           elements : [element1, element]
       }

`oscType` "bundle"

`timetag` is one of:

- `Date` - a JavaScript Date object
- `Array` - `[numberOfSecondsSince1900, fractionalSeconds]`
  Both values are `number`s. This gives full timing accuracy of 1/(2^32) seconds.

`elements` is an `Array` of either _OSC Message_ or _OSC Bundle_

## [spec]: http://opensoundcontrol.org/spec-1_0

## Migrating from 1.0

There have been a few breaking changes from the 1.0 version:

- We now provide type declarations for typescript compatibility
- We always enable the previously optional "strict" errors
- Many explicit error messages for passing in data of the wrong type have been removed. We encourage you to use typescript to prevent these sorts of errors.
- Functions that used to return `Buffer` now return `DataView`
- TimeTags must be specified as `Date`s or `[number, number]` arrays, and are always returned as `[number, number]` arrays. To convert between arrays and `Date`s, use `dateToTimetag` and `timetagToDate`.
- The two-argument version of `toBuffer` has been removed.

## License

Licensed under the terms found in COPYING (zlib license)
