const EOF = Symbol('EOF')

class HtmlParser {
  constructor () {
    this.currentTag = null
  }

  emit (token) {
    console.log(token)
  }

  parseHTML (html) {
    let state = this.data
    for (const c of html) {
      state = state.call(this, c)
    }
    return state.call(this, EOF)
  }

  data (c) {
    if (c === '<') {
      return this.tagOpen
    } else if (c === EOF) {
      this.emit({ type: 'end-of-file' })
    } else {
      this.emit({ type: 'character', char: c })
      return this.data
    }
  }

  tagOpen (c) {
    if (c === '/') {
      return this.endTagopen
    } else if (isLetter(c)) {
      this.currentTag = { type: 'start-tag', tagName: '' }
      return this.tagName(c)
    } else if (c === EOF) {
      this.emit({ type: 'character', char: '<' })
      this.emit({ type: 'end-of-file' })
    } else {
      this.emit({ type: 'character', char: '<' })
      return this.data(c)
    }
  }

  tagName (c) {
    if (isSpace(c)) {
      return this.beforeAttributeName
    } else if (c === '/') {
      return this.selfClosingStartTag
    } else if (c === '>') {
      this.emit(this.token)
      return this.data
    } else if (c === EOF) {
      this.emit({ type: 'end-of-file', content: c })
      return this.tagName
    } else {
      this.token.content += c
      return this.tagName
    }
  }

  beforeAttributeName (c) {
    if (isSpace(c)) {
      return this.beforeAttributeName
    } else if (/^[\/>]$/.test(c) || c === EOF) {
      return this.afterAttributeAame(c)
    } else {
      this.token.attribute = { name: c, value: '' }
      return c === '='
        ? this.attributeAame
        : this.attributeAame(c)
    }
  }

  SelfClosingStartTag (c) {
    if (c === '>') {
      this.token.isSelfClosing = true
      this.emit(this.token)
    }
  }
}

module.exports.parseHTML = body => {
  const parser = new HtmlParser()
  return parser.parseHTML(body)
}

function isLetter (c) {
  return /^[a-zA-Z]$/.test(c)
}

function isSpace (c) {
  return /^[\t\n\f\s]$/.test(c)
}
