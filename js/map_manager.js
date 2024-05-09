class Map_Manager {
  constructor(properties) {

    for (var p in properties){
        this[p]=properties[p]
    }
    if (this.params){
        if (this.params.hasOwnProperty('z')){
            this.z = Number(this.params['z'])
        }
         if (this.params.hasOwnProperty('c')){
            var c = this.params['c'].split(',')
            this.lat= Number(c[0])
            this.lng = Number(c[1])
        }

    }else{
        this.params={}
    }
     this.map = L.map('map',{doubleClickZoom: false,
     }).setView([this.lat, this.lng], this.z);
      this.map.options.minZoom = 2;


     this.markers=[]
  }
  init(){
    var $this=this
     L.control.scale().addTo( this.map);
     this.map.createPane('left');


    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {

    attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo( this.map)

     //
    const search = new GeoSearch.GeoSearchControl({
      provider: new GeoSearch.OpenStreetMapProvider(),
    });

    this.map.addControl(search);

   // get lat lng on click
    this.map.on('dblclick', function(e) {
     $this.create_marker(e.latlng)
    });
    //

    L.control.layer_list({ position: 'bottomleft' }).addTo( this.map);

    this.map.on("moveend", function () {
      update_layer_list();
      var c =  map_manager.map.getCenter()
         map_manager.set_url_params("c",c.lat+","+c.lng)
         map_manager.set_url_params("z", map_manager.map.getZoom())
         save_params()
    });
  }
    move_map_pos(_params){
        var z = Number(_params['z'])
        var c = _params['c'].split(',')
        var lat= Number(c[0])
        var lng = Number(c[1])
         this.map.setView([lat, lng], z, {animation: true});
    }

    set_url_params(type,value){
        // allow or saving details outside of the filter list but
        //added to the json_str when the map changes
         this.params[type]= value

    }
    // markers
  create_geojson_lines(_data,_group_field){
   this.data=_data
   var output_json={ "type": 'FeatureCollection', "features": []}
   this.grouped_data={}
    for(var i=0;i<this.data.features.length;i++){
        var obj =this.data.features[i]
        var props=obj.properties
        //check if id has been seen before
        if (typeof(this.grouped_data[props[_group_field]])=="undefined"){
            this.grouped_data[props[_group_field]]=[]
        }
         this.grouped_data[props[_group_field]].push(obj)
    }


    //create a line for each group
    for(var i in this.grouped_data){
            //sort points
            this.grouped_data[i].sort((a, b) => a.properties.start_date - b.properties.start_date)

            var coords =[]
            var compound_title=""
            for(var m=0;m<this.grouped_data[i].length;m++){
                var obj = this.grouped_data[i][m]
                compound_title+=$.datepicker.formatDate( "yy-mm-dd", new Date(obj.properties.start_date) )+' - <b>'+obj.properties.place+"</b><br/>"
                coords.push(obj.geometry.coordinates)
                // set all colors to the last set color in the group
                obj.properties.color=this.grouped_data[i][this.grouped_data[i].length-1].properties.color
            }
            obj.properties.compound_title=compound_title
             var obj_props=obj.properties;

             output_json["features"].push({ "type": 'Feature', "properties": obj_props, "geometry":{"coordinates": coords,"type": 'LineString'}})
        }
        //
        map_manager.show_geojson_lines(output_json)
}
 show_geojson_lines(_geojson){

     geojson = L.geoJson(_geojson, {
     style: function(feature) {
        layer_rects.push(feature)
        return {color: feature.properties.color}

    },
    onEachFeature: function (feature, layer) {
          var html='<h6>'+feature.properties.full_name+'</h6>'+feature.properties.compound_title
          layer.bindPopup(html);
     }
    })
    this.map.addLayer(geojson);

    }
 show_geojson_points(_data){

      var $this=this
       clustered_points = L.markerClusterGroup();
          geojson_markers = L.geoJson(_data, {
          onEachFeature: function (feature, layer) {
                var date_str = $.datepicker.formatDate( "yy-mm-dd", new Date(feature.properties.start_date) );
                var html='<h6>'+feature.properties.full_name+'</h6>' +'<br/><span class="label"Place/Position:</span> '+feature.properties.place+'<br/><span class="label">Start Date:</span> '+date_str;
                html+='<br/><br/><button onclick="confirm_delete('+feature.properties.OBJECTID+')" type="button" class="btn btn-outline-danger"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"></path><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"></path></svg></button>'
                layer.bindPopup(html);
          },
          pointToLayer: function (feature, latlng) {
                var extra='style="border-color: white;background-color: '+feature.properties.color+';"'
                var marker= L.marker(latlng, {icon: $this.get_marker_icon(extra)});
                $this.markers.push(marker);//track the marker
                return marker
            }
        });
        clustered_points.addLayer(geojson_markers);
        this.map.addLayer(clustered_points);

    }
    highlight_marker(_id){
        for(var i=0;i<this.markers.length;i++){
            if(this.markers[i].feature.properties.id==_id){
                var extra='style="border-color: black;"'
                this.markers[i]._icon.innerHTML='<span class="marker" '+extra+'/>'
            }
        }
    }
    get_marker_icon(extra){
        // define a default marker
        return L.divIcon({
          className: "marker_div",
          iconAnchor: [0, 8],
          labelAnchor: [-6, 0],
          popupAnchor: [0, -36],
          html: '<span class="marker" '+extra+'/>'
        })
    }

    create_marker(lat_lng){
        if(click_marker){
            this.map.removeLayer(click_marker);
        }
        click_marker = new L.marker(lat_lng).addTo(this.map);

        var html='<span class="label">Place/Position:</span> <input class="short_input" id="place"/><br/>'
        html+='<span class="label">Start Date:</span> <input class="short_input data_form_date" id="date" type="text"/><br/>'
        html+='<input id="lat" type="hidden"/>'
        html+='<input id="lng" type="hidden"/>'
        html+='<button onclick="post_data();" type="button" class="btn btn-primary">Save</button>'
        var popup = L.popup().setContent(html);

        click_marker.bindPopup(popup).openPopup();
        this.setup_marker_form();

        click_marker.on("click", function(){
            map_manager.setup_marker_form();
        });


    }
    setup_marker_form(){
        var lat_lng= click_marker.getLatLng()
         $(".data_form_date").datetimepicker({
            timepicker:false,
            format:'Y-m-d',
            mask:true
        });
        $('#lat').val(lat_lng["lat"]);
        $('#lng').val(lat_lng["lng"]);
    }
 }