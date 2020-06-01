module.exports.layout = function layout (element) {
  if (element == null ||
    !element.computedStyle ||
    element.computedStyle.display !== 'flex') return

  const elementStyle = getStyle(element)
  const children = element.children.filter(child => {
    return child.type === 'element'
  }).sort((prev, next) => {
    return (prev.order || 0) - (next.order || 0)
  })

  ;[
    ['width', null],
    ['height', null],
    ['flexDirection', 'row'],
    ['aliginItems', 'stretch'],
    ['justifyContent', 'flex-start'],
    ['flexWrap', 'nowrap'],
    ['aliginContent', 'stretch'],
  ].forEach(item => {
    setDefault(elementStyle, item[0], item[1])
  })

  if (!flexDirections.has(elementStyle.flexDirection)) return

  // let {
  //   mainSize, mainStart, mainEnd, mainSign, mainBase,
  //   crossSize, crossStart, crossEnd, crossSign, crossBase
  // }
  const layoutAxis = computeLayoutAxis(elementStyle)
  layoutAxis.isAutoMianSize = computeAutoMainSize(elementStyle, children, layoutAxis.mainSize)

  const flexLines = computeFlexLines(elementStyle, children, layoutAxis)
  computeMainAxis(elementStyle, children, layoutAxis, flexLines)
  computeCrossAxis(elementStyle, children, layoutAxis, flexLines)
}

function getStyle (element) {
  const style = element.style || (element.style = {})
  const computedStyle = element.computedStyle
  for (const prop in computedStyle) {
    let value = computedStyle[prop]
    if (value == null) continue
    
    if (`${value}`.match(/px$/)
      || `${value}`.match(/^[0-9\.]+$/)) {
      style[prop] = parseInt(value)
    } else {
      style[prop] = value
    }
  }
  return style
}

function setDefault (target, prop, defaultValue) {
  const value = target && target[prop]
  if (value && value !== 'auto') return
  target[prop] = defaultValue
}

function computeFlexLines (style, children, layoutAxis) {
  const flexLines = []
  const { mainSize, crossSize, isAutoMianSize } = layoutAxis

  let flexLine = []
  let mainSpace = style[mainSize]
  let crossSpace = 0
  flexLines.push(flexLine)

  for (const child of children) {
    const childStyle = getStyle(child)
    setDefault(childStyle, mainSize, 0)

    if (childStyle.flex != null) {
      flexLine.push(child)
    } else if (style.flexWrap === 'nowrap' || isAutoMianSize) {
      mainSpace -= childStyle[mainSize]
      if (childStyle[crossSize] != null) {
        crossSpace = Math.max(crossSpace, childStyle[crossSize])
      }
      flexLine.push(child)
    } else {
      if (childStyle[mainSize] > style[mainSize]) {
        childStyle[mainSize] = style[mainSize]
      }
      if (mainSpace < childStyle[mainSize]) {
        flexLine.mainSpace = mainSpace
        flexLine.crossSpace = crossSpace
        flexLine = [child]
        flexLines.push(flexLine)
        mainSpace = style[mainSize]
        crossSpace = 0
      } else {
        flexLine.push(child)
      }
      if (childStyle[crossSize] != null) {
        crossSpace = Math.max(crossSpace, childStyle[crossSize])
      }
      mainSpace -= childStyle[mainSize]
    }
  }

  flexLine.mainSpace = mainSpace
  if (style.flexWrap === 'nowrap' || isAutoMianSize) {
    flexLine.crossSpace = style[crossSize] == null
      ? crossSpace
      : style[crossSize]
  } else {
    flexLine.crossSpace = crossSpace
  }

  return flexLines
}

function computeMainAxis (style, children, layoutAxis, flexLines) {
  if (flexLines[0].mainSpace < 0) {
    const { mainSize, mainBase, mainStart, mainEnd } = layoutAxis
    const scale = style[mainSize] / (style[mainSize] - mainSpace)

    let currentMain = mainBase
    for (const child of children) {
      const childStyle = getStyle(child)
      if (childStyle.flex != null) {
        childStyle[mainSize] = 0
      }
      childStyle[mainSize] = childStyle[mainSize] * scale
      childStyle[mainStart] = currentMain
      childStyle[mainEnd] = childStyle[mainStart] + mainSign * childStyle[mainSize]
      currentMain = childStyle[mainEnd]
    }
  } else {
    for (const flexLine of flexLines) {
      const mainSpace = flexLine.mainSpace
      let flexTotal = 0

      for (const item of flexLine) {
        const itemStyle = getStyle(item)
        if (itemStyle.flex != null) {
          flexTotal += itemStyle.flex
        }
      }

      if (flexTotal > 0) {
        let currentMain = mainBase
        for (const item of flexLine) {
          const itemStyle = getStyle(item)
          if (itemStyle.flex) {
            itemStyle[mainSize] = (mainSpace / flexTotal) * itemStyle.flex
          }
          itemStyle[mainStart] = currentMain
          itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
          currentMain = itemStyle[mainEnd]
        }
      } else {
        let currentMain = null, step = null
        switch (style.justifyContent) {
          case 'flex-start':
            step = 0
            currentMain = mainBase
            break
          case 'flex-end':
            step = 0
            currentMain = mainSpace * mainSign + mainBase
            break
          case 'center':
            step = 0
            currentMain = mainSpace / 2 * mainSign + mainBase
            break
          case 'space-between':
            const partCount = (flexLine.length - 1) || 1
            step = mainSpace / partCount * mainSign
            currentMain = mainBase
            break
          case 'space-around':
            const partCount = flexLine.length || 1
            step = mainSpace / partCount * mainSign
            currentMain = step / 2 + mainBase
            break
        }
        if (currentMain === null) continue
        for (const item of flexLine) {
          const itemStyle = getStyle(item)
          itemStyle[mainStart] = currentMain
          itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
          currentMain = itemStyle[mainEnd] + step
        }
      }
    }
  }
}

function computeCrossAxis (style, children, layoutAxis, flexLines) {
  const { crossSize } = layoutAxis
  let crossSpace = null

  if (style[crossSize] == null) {
    crossSpace = 0
    style[crossSize] = flexLines.reduce((size, flexLine) => {
      return size + flexLine.crossSpace
    }, 0)
  } else {
    crossSpace = style[crossSize]
    for (const flexLine of flexLines) {
      crossSpace -= flexLine.crossSpace
    }
  }
}

function computeAutoMainSize (elementStyle, children, mainSize) {
  const isAutoMianSize = !elementStyle[mainSize]
  if (isAutoMianSize) {
    elementStyle[mainSize] = children.reduce((size, child) => {
      const childSize = getStyle(child)[mainSize]
      if (childSize == null)
        return size
      else
        return size + childSize
    }, 0)
  }
  return isAutoMianSize
}

function computeLayoutAxis (style) {
  const wrap = style.flexWrap
  const direction = style.flexDirection
  const computed = {}

  if (direction === 'row') {
    computed.mainSize = 'width'
    computed.mainStart = 'left'
    computed.mainEnd = 'right'
    computed.mainSign = +1,
    computed.mainBase = 0,
    computed.crossSize = 'height'
    computed.crossStart = 'top'
    computed.crossEnd = 'bottom'
  } else if (direction === 'row-reverse') {
    computed.mainSize = 'width'
    computed.mainStart = 'right'
    computed.mainEnd = 'left'
    computed.mainSign = -1,
    computed.mainBase = style.width,
    computed.crossSize = 'height'
    computed.crossStart = 'top'
    computed.crossEnd = 'bottom'
  } else if (direction === 'column') {
    computed.mainSize = 'height'
    computed.mainStart = 'top'
    computed.mainEnd = 'bottom'
    computed.mainSign = +1,
    computed.mainBase = 0,
    computed.crossSize = 'width'
    computed.crossStart = 'left'
    computed.crossEnd = 'right'
  } else if (direction === 'column-reverse') {
    computed.mainSize = 'height'
    computed.mainStart = 'bottom'
    computed.mainEnd = 'top'
    computed.mainSign = -1
    computed.mainBase = style.height
    computed.crossSize = 'width'
    computed.crossStart = 'left'
    computed.crossEnd = 'right'
  }

  if (wrap === 'wrap-reverse') {
    const temp = crossStart
    computed.crossStart = crossEnd
    computed.crossEnd = temp
    computed.crossSign = -1
    computed.crossBase = style[computed.crossSize]
  } else {
    computed.crossSign = +1
    computed.crossBase = 0
  }

  return computed
}
