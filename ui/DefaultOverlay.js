import Component from './Component'

/*
  A default implementation to render the content for the overlay (aka popup) toolbar.

  > TODO: be careful with the name. If it is an overlay _and_ always used to
    render tools, we should reflect this in the name (e.g. OverlayToolbar)
*/
function DefaultOverlay() {
  Component.apply(this, arguments);
}

DefaultOverlay.Prototype = function() {

  this.render = function($$) {
    var el = $$('div').addClass(this.getClassNames());
    var commandStates = this.props.commandStates;
    var tools = this.context.tools;
    var overlayTools = tools.get('overlay');

    overlayTools.forEach(function(tool, name) {
      var toolProps = Object.assign({}, commandStates[name], {
        name: name,
        icon: name
      })

      if (toolProps && !toolProps.disabled) {
        el.append(
          $$(tool.Class, toolProps).ref(tool.name)
        );
      }
    });
    return el;
  };

  this.getClassNames = function() {
    return "sc-default-overlay";
  };

};

Component.extend(DefaultOverlay);

export default DefaultOverlay;
