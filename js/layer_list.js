L.Control.LayerList = L.Control.extend({
    onAdd: function(map) {
        var div = L.DomUtil.create('div');

        div.id = 'layer_list';
        L.DomEvent.disableClickPropagation(div)
        return div;
    },

    onRemove: function(map) {
        // Nothing to do here
    }
});

L.control.layer_list = function(opts) {
    return new L.Control.LayerList(opts);
}

