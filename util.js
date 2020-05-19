const EOF = Symbol('EOF')

module.exports.isLetter = function (c) {
  return /^[a-zA-Z]$/.test(c)
}

module.exports.isSpace = function(c) {
  return '\t\n\f '.includes(c)
}

module.exports.isIgnore = function (c) {
  return c === EOF || '/>'.includes(c)
}

module.exports.EOF = EOF
