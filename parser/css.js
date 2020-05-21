const css = require('css')

class CSSHandler {
  constructor(stack) {
    this.rules = []
    this.stack = stack
  }

  addCSSRules(content) {
    const ast = css.parse(content)
    this.rules.push(...ast.stylesheet.rules)
  }

  computeCSS(element) {
    const elements = this.stack.slice().reverse()
    const computedStyle = element.computedStyle
      || (element.computedStyle = {})

    let match = false

    for (let rule of this.rules) {
      const selectorParts = rule.selectors[0].split(' ').reverse()
      if (!this.match(element, selectorParts[0])) {
        continue
      }

      let j = 1

      for (let i = 0; i < elements.length; i++) {
        let element = elements[i]
        let selectorPart = selectorParts[j]
        if (this.match(element, selectorPart)) j++
      }

      if (j >= selectorParts.length) {
        match = true
      }

      if (match) {
        for (let declaration of rule.declarations) {
          const property = declaration.property
          if (!computedStyle[property]) {
            computedStyle[property] = {}
          }
          computedStyle[property].value = declaration.value
        }
      }
    }
  }

  match (element, selector) {
    if (!selector || !element.attributes) {
      return false
    }

    if (selector.charAt(0) === '#') {
      const attr = element.attributes.find(a => a.name === 'id')
      const value = selector.replace('#', '')
      return attr && attr.value === value
    } else if (selector.charAt(0) === '.') {
      const attr = element.attributes.find(a => a.name === 'class')
      const classes = attr ? attr.value.split(' ') : []
      const value = selector.replace('.', '')
      return classes.some(c => c === value)
    } else {
      return element.tagName === selector
    }
  }
}

module.exports.CSSHandler = CSSHandler
