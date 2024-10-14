import * as osc from "osc-min";
import * as dgram from "dgram";

const inport = process.argv[2] != null ? parseInt(process.argv[2]) : 41234;
const outport = process.argv[3] != null ? parseInt(process.argv[3]) : 41235;

const float_to_int = (message) => {
  for (const arg of message.args) {
    if (arg.type === "float") {
      arg.type = "integer";
    }
  }
  return message;
};

const sock = dgram.createSocket("udp4", (msg) => {
  try {
    const edited = osc.applyMessageTransform(msg, (message) =>
      float_to_int(message)
    );
    return sock.send(edited, 0, edited.byteLength, outport, "localhost");
  } catch (error) {
    return console.log("error redirecting", error);
  }
});

sock.bind(inport);

console.log("OSC redirecter running at http://localhost:" + inport);

console.log("translating messages to http://localhost:" + outport);
