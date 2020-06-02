const images = require('images')

function render (viewport, element) {
  if (element.style) {
    const image = images(element.style.width, element.style.height)
    if (element.style.backgroundColor) {
      const color = element.backgroundColor || 'rgb(0, 0, 0)'
      color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      image.fill(Number(RegExp.$1), Number(RegExp.$2), Number(RegExp.$3))
      viewport.draw(image, element.style.left || 0, element.style.top || 0)
    }
  }

  if (element.children) {
    element.children.forEach(child => render(viewport, child))
  }
}

module.exports.render = render