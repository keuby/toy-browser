const net = require('net')

class HttpRequest {
  constructor ({
    method = 'GET',
    path = '/',
    host,
    port = 80,
    body = {},
    headers = {}
  }) {
    this.host = host
    this.path = path
    this.port = port
    this.body = body
    this.method = method
    this.headers = headers

    const contentType = this.headers['Content-Type']
      ? this.headers['Content-Type']
      : (this.headers['Content-Type'] = 'application/x-www-form-urlencoded')

    if (contentType === 'application/json') {
      this.bodyText = JSON.stringify(this.body)
    } else if (contentType === 'application/x-www-form-urlencoded') {
      this.bodyText = Object.keys(this.body).map(key => {
        return `${key}=${encodeURIComponent(this.body[key])}`
      }).join('&')
    }
  }

  send () {
    return new Promise((resolve, reject) => {
      const parser = new ResponseParser()
      const connetion = net.createConnection({
        host: this.host,
        port: this.port
      }, () => {
        connetion.write(this.toString())
      })

      connetion.on('data', data => {
        parser.receive(data.toString())
        resolve(parser.response)
        connetion.end()
      })

      connetion.on('error', error => {
        reject(error)
      })
    })
  }

  toString () {
    return `${this.method.toUpperCase()} ${this.path} HTTP/1.1
${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\n')}

${this.bodyText}`
  }
}
class ResponseParser {
  constructor () {
    this.WAITING_STATUS_LINE = 0
    this.WAITING_HEADER_NAME = 2
    this.WAITING_HEADER_SPACE = 3
    this.WAITING_HEADER_VALUE = 4
    this.WAITING_STATUS_BLOCK_END = 5
    this.WAITING_BODY = 6
    this.WAITING_BODY_END = 6

    this.current = this.WAITING_STATUS_LINE
    this.statusLine = ''
    this.headers = {}
    this.headerName = ''
    this.headerValue = ''
    this.bodyText = ''
    this.bodyParser = null
  }

  get finished () {
    return this.bodyParser && this.bodyParser.finished
  }

  get response () {
    this.statusLine.match(/HTTP\/1.1 (\d+) ([\s\S]+)/)
    return {
      statusCode: Number(RegExp.$1),
      statusText: RegExp.$2,
      headers: this.headers,
      body: this.bodyParser.bodyText
    }
  }

  receive (string) {
    for (const char of string) {
      this.receiveCharactor(char)
    }
  }

  receiveCharactor (char) {
    switch (this.current) {
      case this.WAITING_STATUS_LINE: {
        if (char === '\n') {
          this.current = this.WAITING_HEADER_NAME
        } else if (char !== '\r') {
          this.statusLine += char
        }
        break
      }
      case this.WAITING_HEADER_NAME: {
        if (char === ':') {
          this.current = this.WAITING_HEADER_SPACE
        } else {
          this.headerName += char
        }
        break
      }
      case this.WAITING_HEADER_SPACE: {
        if (char !== ' ') {
          this.headerValue += char
        }
        this.current = this.WAITING_HEADER_VALUE
        break
      }
      case this.WAITING_HEADER_VALUE: {
        if (char === '\n') {
          this.headers[this.headerName] = this.headerValue
          this.headerName = ''
          this.headerValue = ''
          this.current = this.WAITING_STATUS_BLOCK_END
        } else if (char !== '\r') {
          this.headerValue += char
        }
        break
      }
      case this.WAITING_STATUS_BLOCK_END: {
        if (char === '\n') {
          if (this.headers['Transfer-Encoding'] === 'chunked') {
            this.bodyParser = new TrunkedBodyParser()
          }
          this.current = this.WAITING_BODY
        } else if (char !== '\r') {
          this.headerName += char
          this.current = this.WAITING_HEADER_NAME
        }
        break
      }
      case this.WAITING_BODY: {
        this.bodyParser.receiveCharactor(char)
        if (this.bodyParser.finished) {
          this.bodyText = this.bodyParser.bodyText
          this.current = this.WAITING_BODY_END
        }
      }
    }
  }
}

class TrunkedBodyParser {
  constructor () {
    this.WAITING_LENGTH = 0
    this.WAITING_LENGTH_END = 1
    this.READING_TRUNK = 2
    this.READING_TRUNK_END = 3

    this.length = 0
    this.finished = false
    this.content = []

    this.current = this.WAITING_LENGTH
  }

  get bodyText () {
    return this.content.join('')
  }

  receiveCharactor (char) {
    switch (this.current) {
      case this.WAITING_LENGTH: {
        if (char === '\n') {
          if (this.length === 0) {
            this.finished = true
            this.current = this.READING_TRUNK_END
          } else {
            this.current = this.READING_TRUNK
          }
        } else if (char !== '\r') {
          this.length = this.length * 16 + parseInt(char, 16)
        }
        break
      }
      case this.READING_TRUNK: {
        this.content.push(char)
        if (--this.length === 0) {
          this.finished = true
          this.current = this.READING_TRUNK_END
        }
      }
    }
  }
}

const request = new HttpRequest({
  host: '127.0.0.1',
  port: 8088,
  body: { name: 'knight' },
  headers: {
    'Content-Length': 11,
    'X-CSRFToken': 'a'.repeat(24)
  }
})

const parser = require('./parser/html')
const images = require('images')
const { render } = require('./render')

request.send().then(response => {
  const dom = parser.parseHTML(response.body)
  const viewport = images(800, 600)
  render(viewport, dom)
  viewport.save('viewport.jpg')
})
