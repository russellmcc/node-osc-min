import * as osc from "osc-min";
import * as dgram from "dgram";

const inport = process.argv[2] != null ? parseInt(process.argv[2]) : 41234;
const outport = process.argv[3] != null ? parseInt(process.argv[3]) : 41235;

console.log(`OSC redirecter running at http://localhost:${inport}`);
console.log(`redirecting messages to http://localhost:${outport}`);

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
