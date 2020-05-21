const { isLetter, isSpace, EOF } = require('../util')

class HTMLStateMachine {
  constructor (emit = () => {}) {
    this.tagToken = null
    this.commentToken = null
    this.returnState = null
    this.emit = emit
  }

  createAttribute (token, c) {
    const attribute = { name: c || '', value: '' }
    if (token.attributes) {
      token.attributes.push(attribute)
    } else {
      token.attributes = [attribute]
    }
    return attribute
  }

  appendAttributeName (token, c) {
    const lastIdx = token.attributes.length - 1
    const attribute = token.attributes[lastIdx]
    attribute.name += c
  }

  appendAttributeValue (token, c) {
    const lastIdx = token.attributes.length - 1
    const attribute = token.attributes[lastIdx]
    attribute.value += c
  }

  data (c) {
    if (c === EOF) {
      this.emit({ type: 'EOF' })
    } else if (c === '<') {
      return this.tagOpen
    } else {
      this.emit({ type: 'character', char: c })
      return this.data
    }
  }

  tagOpen (c) {
    if (c === EOF) {
      this.emit({ type: 'character', char: '<' })
      this.emit({ type: 'EOF' })
    } else if (c === '/') {
      return this.endTagOpen
    } else if (isLetter(c)) {
      this.tagToken = { type: 'startTag', tagName: '' }
      return this.tagName(c)
    } else {
      this.emit({ type: 'character', char: '<' })
      return this.data(c)
    }
  }

  endTagOpen (c) {
    if (c === EOF) {
      this.emit({ type: 'character', char: '<' })
      this.emit({ type: 'character', char: '/' })
      this.emit({ type: 'EOF' })
      return this.endTagOpen
    } else if (isLetter(c)) {
      this.tagToken = { type: 'endTag', tagName: '' }
      return this.tagName(c)
    } else if (c === '>') {
      return this.data
    } else {
      this.commentToken = { type: 'comment', data: '' }
      return this.bogusComment(c)
    }
  }

  tagName (c) {
    if (c === EOF) {
      this.emit({ type: 'EOF' })
      return this.tagName
    } else if (isSpace(c)) {
      return this.beforeAttributeName
    } else if (c === '/') {
      return this.selfClosingStartTag
    } else if (c === '>') {
      this.emit(this.tagToken)
      return this.data
    } else if (isLetter(c)) {
      this.tagToken.tagName += c.toLowerCase()
      return this.tagName
    } else {
      this.tagToken.tagName += c
      return this.tagName
    }
  }

  beforeAttributeName (c) {
    if (isSpace(c)) {
      return this.beforeAttributeName
    } else if (c === EOF || '/>'.includes(c)) {
      return this.afterAttributeName(c)
    } else if (c === '=') {
      this.createAttribute(this.tagToken, c)
      return this.attributeName
    } else {
      this.createAttribute(this.tagToken)
      return this.attributeName(c)
    }
  }

  afterAttributeName (c) {
    if (c === EOF) {
      this.emit({ type: 'EOF' })
      return this.afterAttributeName
    } else if (isSpace(c)) {
      return this.afterAttributeName
    } else if (c === '/') {
      return this.selfClosingStartTag
    } else if (c === '=') {
      return this.beforeAttributeValue
    } else if (c === '>') {
      this.emit(this.tagToken)
      return this.data
    } else {
      this.createAttribute(this.tagToken)
      return this.attributeName
    }
  }

  beforeAttributeValue (c) {
    if (c === EOF || isSpace(c)) {
      return this.beforeAttributeValue
    } else if (c === '"') {
      return this.attributeValueDoubleQuoted
    } else if (c === '\'') {
      return this.attributeValueSingleQuoted
    } else if (c === '>') {
      this.emit(this.tagToken)
      return this.data
    } else {
      return this.attributeValueUnquoted(c)
    }
  }

  attributeValueDoubleQuoted (c) {
    if (c === EOF) {
      this.emit({ type: 'EOF' })
      return this.attributeValueDoubleQuoted
    } if (c === '"') {
      return this.afterAttributeValueQuoted
    } else if (c === '&') {
      this.returnState = this.attributeValueDoubleQuoted
      return this.characterReference
    } else {
      this.appendAttributeValue(this.tagToken, c)
      return this.attributeValueDoubleQuoted
    }
  }

  attributeValueSingleQuoted (c) {
    if (c === EOF) {
      this.emit({ type: 'EOF' })
      return this.attributeValueSingleQuoted
    } if (c === '\'') {
      return this.afterAttributeValueQuoted
    } else if (c === '&') {
      this.returnState = this.attributeValueSingleQuoted
      return this.characterReference
    } else {
      this.appendAttributeValue(this.tagToken, c)
      return this.attributeValueSingleQuoted
    }
  }

  attributeValueUnquoted (c) {
    if (c === EOF) {
      this.emit({ type: 'EOF' })
      return this.attributeValueUnquoted
    } else if (isSpace(c)) {
      return this.beforeAttributeName
    } else if (c === '&') {
      this.returnState = this.attributeValueUnquoted
      return this.characterReference
    } else if (c === '>') {
      return this.data
    } else if ('"\'<=`'.includes(c)) {
      this.appendAttributeValue(this.tagToken, c)
      return this.attributeValueUnquoted
    } else {
      this.appendAttributeValue(this.tagToken, c)
      return this.attributeValueUnquoted
    }
  }

  afterAttributeValueQuoted (c) {
    if (c === EOF) {
      this.emit({ type: 'EOF' })
      return this.afterAttributeValueQuoted
    } else if (isSpace(c)) {
      return this.beforeAttributeName
    } else if (c === '/') {
      return this.selfClosingStartTag
    } else if (c === '>') {
      this.emit(this.tagToken)
      return this.data
    } else {
      return this.beforeAttributeName(c)
    }
  }

  attributeName (c) {
    if (isSpace(c) || c === EOF || '/>'.includes(c)) {
      return this.afterAttributeName(c)
    } else if (c === '=') {
      return this.beforeAttributeValue
    } else if (isLetter(c)) {
      this.appendAttributeName(this.tagToken, c.toLowerCase())
      return this.attributeName
    } else if ('"\'<'.includes(c)) {
      this.appendAttributeName(this.tagToken, c)
      return this.attributeName
    } else {
      this.appendAttributeName(this.tagToken, c)
      return this.attributeName
    }
  }

  selfClosingStartTag (c) {
    if (c === '>') {
      this.tagToken.isSelfClosing = true
      this.emit(this.tagToken)
      return this.data
    } else if (c === EOF) {
      this.emit({ type: 'EOF' })
      return this.selfClosingStartTag
    } else {
      return this.beforeAttributeName
    }
  }

  bogusComment (c) {
    if (c === EOF) {
      this.emit({ type: 'EOF' })
      return this.bogusComment
    } else if (c === '\u0000') {
      this.commentToken.data += '\ufffd'
      return this.bogusComment
    } else if (c === '>') {
      this.emit(this.commentToken)
      return this.data
    } else {
      this.commentToken.data += c
      return this.bogusComment
    }
  }
}

module.exports.HTMLStateMachine = HTMLStateMachine