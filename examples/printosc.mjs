import * as osc from "osc-min";
import * as udp from "dgram";

const inport = process.argv[2] != null ? parseInt(process.argv[2]) : 41234;

console.log(`OSC listener running at http://localhost:${inport}`);

//~verbatim:examples[0]~
//### A simple OSC printer;

const sock = udp.createSocket("udp4", (msg) => {
  try {
    console.log(osc.fromBuffer(msg));
  } catch (e) {
    console.log("invalid OSC packet", e);
  }
});

sock.bind(inport);
