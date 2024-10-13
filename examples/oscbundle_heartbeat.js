var dgram, now, osc, outport, sendHeartbeat, udp;

osc = require("osc-min");

dgram = require("dgram");

udp = dgram.createSocket("udp4");

if (process.argv[2] != null) {
  outport = parseInt(process.argv[2]);
} else {
  outport = 41234;
}

now = function () {
  return new Date().getTime() / 1000;
};

sendHeartbeat = function () {
  var buf;
  buf = osc.toBuffer({
    timetag: now() + 0.05,
    elements: [
      {
        address: "/p1",
        args: new Buffer("beat"),
      },
      {
        address: "/p2",
        args: "string",
      },
      {
        timetag: now() + 1,
        elements: [
          {
            address: "/p3",
            args: 12,
          },
        ],
      },
    ],
  });
  return udp.send(buf, 0, buf.length, outport, "localhost");
};

setInterval(sendHeartbeat, 2000);

console.log("sending heartbeat messages to http://localhost:" + outport);
