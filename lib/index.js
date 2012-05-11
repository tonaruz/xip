(function() {
  var NS_C_IN, NS_RCODE_NXDOMAIN, NS_T_A, NS_T_CNAME, NS_T_NS, NS_T_SOA, PATTERN, createSOA, decode, dnsserver, encode, matchIP;

  dnsserver = require("dnsserver");

  NS_T_A = 1;

  NS_T_NS = 2;

  NS_T_CNAME = 5;

  NS_T_SOA = 6;

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
    return (value >>> 0).toString(36);
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

  createSOA = function(domain) {
    var expire, minimum, mname, refresh, retry, rname, serial;
    mname = "ns-1." + domain;
    rname = "hostmaster." + domain;
    serial = parseInt(new Date().getTime() / 1000);
    refresh = 28800;
    retry = 7200;
    expire = 604800;
    minimum = 3600;
    return dnsserver.createSOA(mname, rname, serial, refresh, retry, expire, minimum);
  };

  matchIP = function(parts) {
    var matched, part, _i, _len;
    if (parts.length !== 4) return;
    matched = true;
    for (_i = 0, _len = parts.length; _i < _len; _i++) {
      part = parts[_i];
      part = parseInt(part, 10);
      if (!((0 <= part && part <= 255))) matched = false;
    }
    return matched;
  };

  exports.createServer = function(domain, address) {
    var encodeCname, parseHostname, server, soa;
    if (address == null) address = "127.0.0.1";
    server = new dnsserver.Server;
    domain = ("" + domain).toLowerCase();
    soa = createSOA(domain);
    parseHostname = function(hostname) {
      var offset, subdomain;
      if (!hostname) return;
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
    encodeCname = function(subdomain) {
      var hostname, ip;
      if (matchIP(subdomain)) {
        ip = subdomain.slice(0).reverse().join(".");
        hostname = "" + (exports.encode(ip)) + "." + domain;
        return dnsserver.createName(hostname);
      }
    };
    server.on("request", function(req, res) {
      var cname, q, subdomain, _ref, _ref2;
      q = (_ref = req.question) != null ? _ref : {};
      subdomain = parseHostname(q.name);
      if (q.type === NS_T_A && q["class"] === NS_C_IN && (subdomain != null)) {
        if (cname = encodeCname(subdomain)) {
          res.addRR(q.name, NS_T_CNAME, NS_C_IN, 600, cname);
        } else {
          res.addRR(q.name, NS_T_A, NS_C_IN, 600, (_ref2 = decode(subdomain[0])) != null ? _ref2 : address);
        }
      } else if (q.type === NS_T_NS && q["class"] === NS_C_IN && (subdomain != null ? subdomain.length : void 0) === 0) {
        res.addRR(q.name, NS_T_SOA, NS_C_IN, 600, soa, true);
      } else {
        res.header.rcode = NS_RCODE_NXDOMAIN;
      }
      return res.send();
    });
    return server;
  };

}).call(this);
