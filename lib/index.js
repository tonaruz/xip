(function() {
  var NS_C_IN, NS_RCODE_NXDOMAIN, NS_T_A, PATTERN, decode, dnsserver, encode;

  dnsserver = require("dnsserver");

  NS_T_A = 1;

  NS_C_IN = 1;

  NS_RCODE_NXDOMAIN = 3;

  PATTERN = /^[a-z0-9]{1,7}$/;

  exports.encode = encode = function(ip) {
    var byte, index, value, _len, _ref;
    value = 0;
    _ref = ip.split(".");
    for (index = 0, _len = _ref.length; index < _len; index++) {
      byte = _ref[index];
      value += parseInt(byte, 10) << (index * 8);
    }
    return value.toString(36);
  };

  exports.decode = decode = function(string) {
    var ip, value;
    if (PATTERN.test(string)) {
      value = parseInt(string, 36);
      ip = [value & 0xFF];
      value >>= 8;
      ip.push(value & 0xFF);
      value >>= 8;
      ip.push(value & 0xFF);
      value >>= 8;
      ip.push(value & 0xFF);
      return ip.join(".");
    }
  };

  exports.createServer = function(domain, address) {
    var match, server;
    if (address == null) address = "127.0.0.1";
    server = new dnsserver.Server;
    domain = ("" + domain).toLowerCase();
    match = function(hostname) {
      var offset, subdomain;
      hostname = hostname.toLowerCase();
      offset = hostname.length - domain.length;
      if (domain === hostname.slice(offset)) {
        if (0 < offset) {
          subdomain = hostname.slice(0, offset - 1);
          return subdomain.split('.').reverse();
        } else {
          return [];
        }
      }
    };
    server.on("request", function(req, res) {
      var q, subdomain, _ref, _ref2;
      q = (_ref = req.question) != null ? _ref : {};
      if (q.type === NS_T_A && q["class"] === NS_C_IN && (subdomain = match(q.name))) {
        res.addRR(q.name, NS_T_A, NS_C_IN, 600, (_ref2 = decode(subdomain[0])) != null ? _ref2 : address);
      } else {
        res.header.rcode = NS_RCODE_NXDOMAIN;
      }
      return res.send();
    });
    return server;
  };

}).call(this);
