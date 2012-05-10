dnsserver = require "dnsserver"

NS_T_A   = 1
NS_T_NS  = 2
NS_T_SOA = 6
NS_C_IN  = 1
NS_RCODE_NXDOMAIN = 3
PATTERN  = /^[a-z0-9]{1,7}$/

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

createSOA = (domain) ->
  mname   = "ns-1.#{domain}"
  rname   = "hostmaster.#{domain}"
  serial  = parseInt new Date().getTime() / 1000
  refresh = 28800
  retry   = 7200
  expire  = 604800
  minimum = 3600
  dnsserver.createSOA mname, rname, serial, refresh, retry, expire, minimum

exports.createServer = (domain, address = "127.0.0.1") ->
  server = new dnsserver.Server
  domain = "#{domain}".toLowerCase()
  soa = createSOA domain

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
    subdomain = match q.name

    if q.type is NS_T_A and q.class is NS_C_IN and subdomain?
      res.addRR q.name, NS_T_A, NS_C_IN, 600, decode(subdomain[0]) ? address
    else if q.type is NS_T_NS and q.class is NS_C_IN and subdomain?.length is 0
      res.addRR q.name, NS_T_SOA, NS_C_IN, 600, soa, true
    else
      res.header.rcode = NS_RCODE_NXDOMAIN

    res.send()

  server
