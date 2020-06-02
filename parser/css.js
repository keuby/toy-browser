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
    const computedStyle = element.computedStyle || (element.computedStyle = {})

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
        const sp = this.specificiy(rule.selectors[0])
        for (let declaration of rule.declarations) {
          const property = this.toSmallCamelCase(declaration.property)
          if (!computedStyle[property]) {
            computedStyle[property] = {}
          }
          if (!computedStyle[property].specificiy
            || this.compareSpecificiy(computedStyle[property].specificiy, sp) < 0) {
            computedStyle[property].specificiy = sp
            computedStyle[property].value = declaration.value
          }
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

  specificiy (selector) {
    const p = [0, 0, 0, 0]
    const parts = selector.split(' ')
    for (const part of parts) {
      if (part.startsWith('#')) {
        p[0]++
      } else if (part.startsWith('.')) {
        p[1]++
      } else {
        p[2]++
      }
    }
    return p
  }

  compareSpecificiy (sp1, sp2) {
    if (sp1[0] - sp2[0]) return sp1[0] - sp2[0]
    if (sp1[1] - sp2[1]) return sp1[1] - sp2[1]
    if (sp1[2] - sp2[2]) return sp1[2] - sp2[2]
    return sp1[3] - sp2[3]
  }

  toSmallCamelCase (target) {
    return target.replace(/-\w/g, matched => matched[1].toUpperCase())
  }
}

module.exports.CSSHandler = CSSHandler
