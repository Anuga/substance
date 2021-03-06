import Component from '../../ui/Component'
import forEach from '../../util/forEach'
import getRelativeBoundingRect from '../../util/getRelativeBoundingRect'

export default class Dropzones extends Component {
  didMount() {
    this.context.dragManager.on('dragstart', this._onDragStart, this)
    this.context.dragManager.on('dragend', this._onDragEnd, this)
  }

  _onDragEnter(e) {
    // console.log('_onDragEnter', e.target)
    e.target.parentNode.classList.add('sm-over')
  }

  _onDragLeave(e) {
    // console.log('_onDragLeave', e.target)
    e.target.parentNode.classList.remove('sm-over')
  }

  /*
    Get bounding rect for a component (relative to scrollPane content element)
  */
  _getBoundingRect(comp) {
    let scrollPane = comp.context.scrollPane
    let contentElement = scrollPane.getContentElement().getNativeElement()
    let rect = getRelativeBoundingRect(comp.getNativeElement(), contentElement)
    return rect
  }

  _computeDropzones(dragState) {
    let scrollPaneName = this.context.scrollPane.getName()
    let surfaces = dragState.scrollPanes[scrollPaneName].surfaces
    let scopedDropzones = {}

    forEach(surfaces, (surface) => {
      let components = surface.childNodes

      // e.g. 3 components = 4 drop zones (1 before, 1 after, 2 in-between)
      let numDropzones = components.length + 1
      let dropzones = []

      for (let i = 0; i < numDropzones; i++) {
        if (i === 0) {
          // First dropzone
          let firstComp = this._getBoundingRect(components[0])
          dropzones.push({
            type: 'place',
            left: firstComp.left,
            top: firstComp.top,
            width: firstComp.width,
            height: firstComp.height / 2,
            teaserPos: 0,
            dropParams: {
              insertPos: i
            }
          })
        } else if (i === numDropzones - 1) {
          // Last dropzone
          let lastComp = this._getBoundingRect(components[i - 1])
          dropzones.push({
            type: 'place',
            left: lastComp.left,
            top: lastComp.top + lastComp.height / 2,
            width: lastComp.width,
            height: lastComp.height / 2,
            teaserPos: lastComp.height / 2,
            dropParams: {
              insertPos: i
            }
          })
        } else {
          // Drop zone in between two components
          let upperComp = this._getBoundingRect(components[i-1])
          let lowerComp = this._getBoundingRect(components[i])
          let topBound = upperComp.top + upperComp.height / 2
          let bottomBound = lowerComp.top + lowerComp.height / 2

          dropzones.push({
            type: 'place',
            left: upperComp.left,
            top: topBound,
            width: upperComp.width,
            height: bottomBound - topBound,
            teaserPos: (upperComp.top + upperComp.height + lowerComp.top) / 2 - topBound,
            dropParams: {
              insertPos: i
            }
          })
        }

        if (i < numDropzones - 2) {
          let comp = components[i]
          // We get the isolated node wrapper and want to use the content element
          if (comp._isIsolatedNodeComponent) {
            comp = comp.getContent()
          }
          // If component has dropzones declared
          if (comp.getDropzoneSpecs) {
            let dropzoneSpecs = comp.getDropzoneSpecs()
            dropzoneSpecs.forEach((dropzoneSpec) => {
              let dropzoneComp = dropzoneSpec.component
              let rect = this._getBoundingRect(dropzoneComp)
              dropzones.push({
                type: 'custom',
                component: comp,
                dropzoneComponent: dropzoneComp,
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                message: dropzoneSpec.message,
                dropParams: dropzoneSpec.dropParams
              })
            })
          }
        }
      }
      scopedDropzones[surface.getName()] = dropzones
    })
    return scopedDropzones
  }

  render($$) {
    let el = $$('div').addClass('sc-dropzones')
    el.on('dragenter', this._onDrag)
    el.on('dragover', this._onDrag)

    if (this.state.dropzones) {
      // Dropzones are scoped by surfaceId
      forEach(this.state.dropzones, (dropzones, surfaceId) => {
        dropzones.forEach((dropzone, index) => {
          let dropType = dropzone.type
          if (dropType === 'place') {
            el.append(
              $$('div').addClass('se-dropzone').attr({
                'data-dropzone-index': index,
                'data-dropzone-surface': surfaceId
              }).css({
                position: 'absolute',
                top: dropzone.top,
                left: dropzone.left,
                width: dropzone.width,
                height: dropzone.height
              }).append(
                $$('div').addClass('se-drop-teaser').css({
                  top: dropzone.teaserPos
                }),
                $$('div').addClass('se-drop-shield')
                  .on('dragenter', this._onDragEnter)
                  .on('dragleave', this._onDragLeave)
                  .on('drop', this._onDrop)
              )
            )
          } else if (dropType === 'custom') {
            el.append(
              $$('div').addClass('se-custom-dropzone').attr({
                'data-dropzone-index': index,
                'data-dropzone-surface': surfaceId
              }).css({
                position: 'absolute',
                top: dropzone.top,
                left: dropzone.left,
                width: dropzone.width,
                height: dropzone.height
              }).append(
                // TODO: also provide se-custom-drop-teaser when custom
                // dropzone is provided
                $$('div').addClass('se-message').append(dropzone.message),
                $$('div').addClass('se-drop-shield')
                  .on('dragenter', this._onDragEnter)
                  .on('dragleave', this._onDragLeave)
                  .on('drop', this._onDrop)
              )
            )
          }
        })
      })
    } else {
      el.addClass('sm-hidden')
    }
    return el
  }

  _onDragStart(dragState) {
    let dropzones = this._computeDropzones(dragState)
    setTimeout(() => {
      this.setState({
        dropzones: dropzones
      })
    })
  }

  _onDragEnd() {
    this.setState({})
  }

  _onDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    let dropzoneIndex = e.target.parentNode.dataset.dropzoneIndex
    let dropzoneSurface = e.target.parentNode.dataset.dropzoneSurface
    let dropzone = this.state.dropzones[dropzoneSurface][dropzoneIndex]
    let dropParams = dropzone.dropParams
    let dropType = dropzone.type
    // Determine target surface
    let targetSurface = this.context.surfaceManager.getSurface(dropzoneSurface)
    // Original component (e.g. img element)
    let component = dropzone.component
    let dropzoneComponent = dropzone.dropzoneComponent
    this.context.dragManager.handleDrop(e, {
      targetSurface,
      dropType,
      dropParams,
      component,
      dropzoneComponent
    })
  }

  _renderDropTeaser(hints) {
    if (hints.visible) {
      this.el.removeClass('sm-hidden')
      this.el.css('top', hints.rect.top)
      this.el.css('left', hints.rect.left)
      this.el.css('right', hints.rect.right)
    } else {
      this.el.addClass('sm-hidden')
    }
  }

  // just so that the teaser does not prevent dropping
  _onDrag(e) { e.preventDefault() }
}
