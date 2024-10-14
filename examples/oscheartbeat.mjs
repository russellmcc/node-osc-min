import { toBuffer } from "osc-min";
import * as dgram from "dgram";
const udp = dgram.createSocket("udp4");

const outport = process.argv[2] != null ? parseInt(process.argv[2]) : 41234;

console.log(`sending heartbeat messages to http://localhost:${outport}`);

//~verbatim:examples[1]~
//### Send a bunch of args every two seconds;

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
