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

## Installation

The easiest way to get osc-min is through [NPM](http://npmjs.org).
After install npm, you can install osc-min in the current directory with

```
npm install osc-min
```

If you'd rather get osc-min through github (for example, if you're forking
it), you still need npm to install dependencies, which you can do with

```
npm install
```

Once you've got all the dependencies you should be able to run the unit
tests with

```
npm test
npm run-script coverage
```

### For the browser

If you want to use this library in a browser, you can build a browserified file (`build/osc-min.js`) with

```
npm install
npm run-script browserify
```

## Examples

TODO: import from examples folder

---

## API

TODO: api docs

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
  - `timetag` - numeric value
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

  - `null` - meaning now, the current time.
    By the time the bundle is received it will too late and depending
    on the receiver may be discarded or you may be scolded for being late.
  - `number` - relative seconds from now with millisecond accuracy.
  - `Date` - a JavaScript Date object in your local time zone.
    OSC timetags use UTC timezone, so do not try to adjust for timezones,
    this is not needed.
  - `Array` - `[numberOfSecondsSince1900, fractionalSeconds]`
    Both values are `number`s. This gives full timing accuracy of 1/(2^32) seconds.

`elements` is an `Array` of either _OSC Message_ or _OSC Bundle_

## [spec]: http://opensoundcontrol.org/spec-1_0

## License

Licensed under the terms found in COPYING (zlib license)
