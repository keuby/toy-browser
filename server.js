const http = require('http')

const server = http.createServer((req, res) => {
  console.log('request received')
  console.log(req.headers)
  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('X-Foo', '')
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  })
  res.end(`<html maaa=a >
<head>
    <style>
body div #myid{
    width:100px;
    background-color: #ff5000;
}
body div img{
    width:30px;
    background-color: #ff1111;
}
    </style>
</head>
<body>
    <div>
        <img id="myid" src="http://www.baidu.com" />
        <img />
    </div>
</body>
</html>`)
})

server.listen(8088)
