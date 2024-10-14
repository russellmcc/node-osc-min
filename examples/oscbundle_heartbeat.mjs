import * as osc from "osc-min";
import * as dgram from "dgram";

const udp = dgram.createSocket("udp4");

const outport = process.argv[2] != null ? parseInt(process.argv[2]) : 41234;

const sendHeartbeat = () => {
  const buf = osc.toBuffer({
    timetag: new Date(new Date().getTime() + 50),
    elements: [
      {
        address: "/p1",
        args: new TextEncoder().encode("beat"),
      },
      {
        address: "/p2",
        args: "string",
      },
      {
        timetag: new Date(new Date().getTime() + 1000),
        elements: [
          {
            address: "/p3",
            args: 12,
          },
        ],
      },
    ],
  });
  return udp.send(buf, 0, buf.byteLength, outport, "localhost");
};

setInterval(sendHeartbeat, 2000);
console.log(`sending heartbeat messages to http://localhost:${outport}`);
