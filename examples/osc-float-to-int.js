var float_to_int, inport, osc, outport, sock, udp;

osc = require("osc-min");

udp = require("dgram");

if (process.argv[2] != null) {
  inport = parseInt(process.argv[2]);
} else {
  inport = 41234;
}

if (process.argv[3] != null) {
  outport = parseInt(process.argv[3]);
} else {
  outport = 41235;
}

float_to_int = function (message) {
  var arg, i, len, ref;
  ref = message.args;
  for (i = 0, len = ref.length; i < len; i++) {
    arg = ref[i];
    if (arg.type === "float") {
      arg.type = "integer";
    }
  }
  return message;
};

sock = udp.createSocket("udp4", function (msg, rinfo) {
  var edited, error;
  try {
    edited = osc.applyMessageTransform(msg, function (message) {
      return float_to_int(message);
    });
    return sock.send(edited, 0, edited.length, outport, "localhost");
  } catch (error1) {
    error = error1;
    return console.log("error redirecting: " + error);
  }
});

sock.bind(inport);

console.log("OSC redirecter running at http://localhost:" + inport);

console.log("translating messages to http://localhost:" + outport);
