dnsserver = require "dnsserver"

NS_T_A  = 1
NS_C_IN = 1
NS_RCODE_NXDOMAIN = 3
PATTERN = /^[a-z0-9]{1,7}$/

exports.encode = encode = (ip) ->
  value = 0
  for byte, index in ip.split "."
    value += parseInt(byte, 10) << (index * 8)
  value.toString 36

exports.decode = decode = (string) ->
  if PATTERN.test string
    value = parseInt string, 36
    ip = [value & 0xFF]
    value >>= 8
    ip.push value & 0xFF
    value >>= 8
    ip.push value & 0xFF
    value >>= 8
    ip.push value & 0xFF
    ip.join "."

exports.createServer = (domain, address = "127.0.0.1") ->
  server = new dnsserver.Server
  domain = "#{domain}".toLowerCase()

  match = (hostname) ->
    hostname = hostname.toLowerCase()
    offset = hostname.length - domain.length

    if domain is hostname.slice offset
      if 0 < offset
        subdomain = hostname.slice 0, offset - 1
        subdomain.split('.').reverse()
      else
        []

  server.on "request", (req, res) ->
    q = req.question ? {}

    if q.type is NS_T_A and q.class is NS_C_IN and subdomain = match q.name
      res.addRR q.name, NS_T_A, NS_C_IN, 600, decode(subdomain[0]) ? address
    else
      res.header.rcode = NS_RCODE_NXDOMAIN

    res.send()

  server
