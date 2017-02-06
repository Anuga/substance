import startsWith from '../../util/startsWith'
import AbstractIsolatedNodeComponent from '../../ui/AbstractIsolatedNodeComponent'

/*
  Ideas:
    - 'Open' IsolatedNodes: Simple structured nodes could be left 'open', i.e. without a blocker
      and always 'enabled'.
      This works only in browsers that are able to deal with 'contenteditable' isles,
      i.e. a structure where the isolated node is contenteditable=false, and inner elements have contenteditable=true
      Does not work in Edge. Works in Chrome, Safari
      Drawbacks:
      - it is not possible to select the node e.g. to delete (is that true?)



*/
class IsolatedNodeComponent extends AbstractIsolatedNodeComponent {

  constructor(...args) {
    super(...args)
  }

  render($$) {
    let node = this.props.node
    let ContentClass = this.ContentClass
    // console.log('##### IsolatedNodeComponent.render()', $$.capturing);
    let el = $$('div')
    el.addClass(this.getClassNames())
      .addClass('sc-isolated-node')
      .addClass('sm-'+this.props.node.type)
      .attr("data-id", node.id)

    let disabled = this.isDisabled()

    if (this.state.mode) {
      el.addClass('sm-'+this.state.mode)
    } else {
      el.addClass('sm-not-selected')
    }

    if (!ContentClass.noStyle) {
      el.addClass('sm-default-style')
    }

    // react on ESCAPE
    el.on('keydown', this.onKeydown)

    let content = this.renderContent($$, node).ref('content')

    el.append(content)

    if (disabled) {
      el.addClass('sm-disabled')
        .attr('contenteditable', false)
      el.append(
        $$('div').addClass('se-blocker')
          .attr('draggable', true)
          .attr('contenteditable', false)
          .on('mousedown', this._reserveMousedown, this)
          .on('click', this.onClick)

      )
    } else {
      if (this.state.mode === 'selected') {
        el.attr('contenteditable', false)
      }
      el.on('mousedown', this._reserveMousedown, this)
        .on('click', this.onClick)
    }

    return el
  }

  getClassNames() {
    return ''
  }

  getContent() {
    return this.refs.content
  }

  _deriveStateFromSelectionState(selState) {
    let sel = selState.getSelection()
    let surfaceId = sel.surfaceId
    if (!surfaceId) return
    let id = this.getId()
    let nodeId = this.props.node.id
    let parentId = this._getSurfaceParent().getId()
    let inParentSurface = (surfaceId === parentId)
    // detect cases where this node is selected or co-selected by inspecting the selection
    if (inParentSurface) {
      if (sel.isNodeSelection() && sel.getNodeId() === nodeId) {
        if (sel.isFull()) {
          return { mode: 'selected' }
        } else if (sel.isBefore()) {
          return { mode: 'cursor', position: 'before' }
        } else if (sel.isAfter()) {
          return { mode: 'cursor', position: 'after' }
        }
      }
      if (sel.isContainerSelection() && sel.containsNodeFragment(nodeId)) {
        return { mode: 'co-selected' }
      }
      return
    }
    if (sel.isCustomSelection() && id === surfaceId) {
      return { mode: 'focused' }
    }
    // HACK: a looks a bit hacky. Fine for now.
    // TODO: we should think about switching to surfacePath, instead of surfaceId
    else if (startsWith(surfaceId, id)) {
      let path1 = id.split('/')
      let path2 = surfaceId.split('/')
      let len1 = path1.length
      let len2 = path2.length
      if (len2 > len1 && path1[len1-1] === path2[len1-1]) {
        if (len2 === len1 + 1) {
          return { mode: 'focused' }
        } else {
          return { mode: 'co-focused' }
        }
      } else {
        return null
      }
    }
  }

  _selectNode() {
    // console.log('IsolatedNodeComponent: selecting node.');
    let editorSession = this.context.editorSession
    let surface = this.context.surface
    let nodeId = this.props.node.id
    editorSession.setSelection({
      type: 'node',
      nodeId: nodeId,
      containerId: surface.getContainerId(),
      surfaceId: surface.id
    })
  }

  onClick(event) {
    if (this._mousedown) {
      // console.log('%s: onClick()', this.id, event)
      this._mousedown = false
      if (this.state.mode !== 'selected' && this.state.mode !== 'focused') {
        event.preventDefault()
        event.stopPropagation()
        this._selectNode()
      }
    }
  }

  // EXPERIMENTAL: Surface and IsolatedNodeComponent communicate via flag on the mousedown event
  // and only reacting on click or mouseup when the mousedown has been reserved
  _reserveMousedown(event) {
    if (event.__reserved__) {
      // console.log('%s: mousedown already reserved by %s', this.id, event.__reserved__.id)
      return
    } else {
      // console.log('%s: taking mousedown ', this.id)
      event.__reserved__ = this
      this._mousedown = true
    }
  }

  get id() { return this.getId() }
}

IsolatedNodeComponent.prototype._isIsolatedNodeComponent = true

IsolatedNodeComponent.prototype._isDisabled = IsolatedNodeComponent.prototype.isDisabled

IsolatedNodeComponent.getDOMCoordinate = function(comp, coor) {
  let domCoor
  if (coor.offset === 0) {
    domCoor = {
      container: comp.el.getNativeElement(),
      offset: 0
    }
  } else {
    domCoor = {
      container: comp.el.getNativeElement(),
      offset: 1
    }
  }
  return domCoor
}

IsolatedNodeComponent.getDOMCoordinates = function(comp) {
  let el = comp.el
  let parent = el.parentNode
  let childIdx = parent.getChildIndex(el)
  return {
    start: {
      container: parent.getNativeElement(),
      offset: childIdx
    },
    end: {
      container: parent.getNativeElement(),
      offset: childIdx+1
    }
  }
}

export default IsolatedNodeComponent
