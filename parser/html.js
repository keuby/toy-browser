const { CSSHandler } = require('./css')
const { HTMLStateMachine, EOF } = require('./html-state-machine')

class HtmlParser {
  constructor () {
    this.currentTextNode = null
    this.stack = [{ type: 'document', children: [] }]
  }

  parseHTML (html) {
    this.currentTextNode = null
    this.stack = [{ type: 'document', children: [] }]

    const cssHandler = new CSSHandler(this.stack)
    const stateMachine = new HTMLStateMachine(token => {
      this.emit(token, cssHandler)
    })

    let state = stateMachine.data
    for (const c of html) {
      state = state.call(stateMachine, c)
    }
    state.call(stateMachine, EOF)
    return this.stack[0]
  }

  emit (token, cssHandler) {
    const top = this.stack[this.stack.length - 1]

    if (token.type === 'startTag') {
      const element = {
        type: 'element',
        tagName: token.tagName,
        children: [],
        attributes: token.attributes || [],
        parent: top
      }

      cssHandler.computeCSS(element)

      top.children.push(element)
      if (!token.isSelfClosing) {
        this.stack.push(element)
      }
      this.currentTextNode = null
    } else if (token.type === 'endTag') {
      if (token.tagName !== top.tagName) {
        throw new Error('element is not matched')
      } else {
        if (token.tagName === 'style') {
          cssHandler.addCSSRules(top.children[0].content)
        }
        this.stack.pop()
      }
      this.currentTextNode = null
    } else if (token.type === 'character') {
      if (this.currentTextNode) {
        this.currentTextNode.content += token.char
      } else {
        this.currentTextNode = {
          type: 'text',
          content: token.char
        }
        top.children.push(this.currentTextNode)
      }
    }
  }
}

module.exports.parseHTML = function (body) {
  const parser = new HtmlParser()
  return parser.parseHTML(body)
}
