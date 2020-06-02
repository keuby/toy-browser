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
        body div {
            display: flex;
            justify-content: center;
            align-items: center;
        }
        body div #myid{
            width:100px;
            height:100px;
            background-color: rgb(255, 0, 0);
        }
        body div img{
            width:30px;
            height:30px;
            background-color: rgb(0, 255, 0);
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
