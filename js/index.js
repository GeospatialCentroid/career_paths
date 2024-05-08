var geojson_url = "https://services1.arcgis.com/KNdRU5cN6ENqCTjk/arcgis/rest/services/career_points/FeatureServer/0/query?where=1%3D1&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&resultType=none&distance=0.0&units=esriSRUnit_Meter&relationParam=&returnGeodetic=false&outFields=*&returnGeometry=true&returnCentroid=false&featureEncoding=esriDefault&multipatchOption=xyFootprint&maxAllowableOffset=&geometryPrecision=&outSR=&defaultSR=&datumTransformation=&applyVCSProjection=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnQueryGeometry=false&returnDistinctValues=false&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&returnZ=false&returnM=false&returnExceededLimitFeatures=true&quantizationParameters=&sqlFormat=none&f=pgeojson&token="
var group_field="full_name"
//
var map_manager
var map_layer
var click_marker;
var layer_rects=[];

var transcription
var transcription_mode;

var params={}
var last_params={}
var usp={};// the url params object to be populated
var browser_control=false; //flag for auto selecting to prevent repeat cals

var progress_interval;
var geojson_markers;
var clustered_points;
var geojson;

function setup_params(){
     usp = new URLSearchParams(window.location.search.substring(1).replaceAll("~", "'").replaceAll("+", " "))

    if (window.location.search.substring(1)!="" && $.isEmptyObject(params)){
       if (usp.get('e')!=null){
            params['e'] =  rison.decode(usp.get('e'))
        }
        //support passing contentdm id
        if (usp.get('id')!=null){
            params['id'] =  usp.get('id')
        }


    }
}

window.onload = function() {
         //simulate progress - load up to 90%
      var current_progress = 0;
     progress_interval = setInterval(function() {
          current_progress += 5;
          $("#loader").css("width", current_progress + "%")
          if (current_progress >= 90)
              clearInterval(progress_interval);

      }, 100);
};
$(document).ready(function() {
    load_do(geojson_url,init)
    show_form();
});


function load_do(_file,_do){
    $.ajax({
        type: "GET",
        url: _file,
        dataType: "json",
        success: function(json) {
         _do(json);
         }
     });
}

function init(json){

    setup_params()

    map_manager = new Map_Manager(
     {params:params['e'] ,
        lat:40.111,
        lng: -104.1378635,
        z:7
        })

    map_manager.init()
    show_data(json)
    //map_manager.map.fitBounds(geojson_markers.getBounds());
}
function reset(json){
     map_manager.map.removeLayer(click_marker);
     map_manager.map.removeLayer(clustered_points);
     map_manager.map.removeLayer(geojson);
     layer_rects=[];
     show_data(json)
}
function show_data(json){

    map_manager.show_geojson_points(json)
    map_manager.create_geojson_lines(json,group_field)

}
function save_marker_data(_data){
    map_manager.data = $.csv.toObjects(_data);
    check_all_loaded();
}
function save_transcription_data(_data){
    transcription.data = $.csv.toObjects(_data);
    check_all_loaded();
}

function check_all_loaded(){

    //if we are transcribing we need to make sure that both the geolocated sheets
    //and the transcriptions are loaded
  if(transcription_mode){
    if(transcription.data && map_manager.data){
        transcription.group_transcription()
        transcription.connect_transcription()
        all_done()
    }
  }else{
        all_done()
  }
}
function all_done(){
     clearInterval(progress_interval)
        $("#loader").css("width", 100 + "%")
        setTimeout( function() {

            $(".overlay").fadeOut("slow", function () {
                $(this).css({display:"none",'background-color':"none"});
            });
        },600);

     map_manager.create_geojson()
}

function save_params(){
    var p = "?"
    +"e="+rison.encode(map_manager.params)
    if(JSON.stringify(p) != JSON.stringify(last_params) && !browser_control){
       window.history.pushState(p, null, window.location.pathname+p.replaceAll(" ", "+").replaceAll("'", "~"))
        last_params = p
    }
}


update_layer_list=function(){
    var html="<table>"
    var map_bounds=map_manager.map.getBounds()
    for(var i =0;i<layer_rects.length;i++){
        var geom = L.GeoJSON.coordsToLatLngs(layer_rects[i].geometry.coordinates);
        var line = L.polyline(geom);
        if(map_bounds.intersects(line.getBounds())){
            html+="<tr><td>"+layer_rects[i].properties.full_name+' </td><td><span class="marker" style="top:0px;left:0px;border-color: white;background-color: '+layer_rects[i].properties.color+';"></span></tr>'

        }

    }
    html+="</table>"
    $("#layer_list").html(html)
}

show_form=function(){
    $('#model_data_form').modal('show');
    $("#color").drawrpalette()
}
close_form =function(){
     $('#model_data_form').modal('hide');
}
post_data = function(){
    var save_url = geojson_url.substring(0,geojson_url.lastIndexOf("query?"))+"applyEdits"
     var point_obj={
            "geometry": {
              "x": $('#lng').val(),
              "y" :$('#lat').val(),
              "spatialReference":{"wkid":4326}
            },
            "attributes": {
                 'full_name':$('#name').val(),
                 'place':$('#place').val(),
                 'start_date':$('#date').val(),
                 'color':$('#color').val()
            }
          }
        save_point(save_url,point_obj,'adds')

}

save_point = function(save_url,point_obj,change_type){
      var data ={f:"json"}
      data[change_type]=JSON.stringify(point_obj)

     $.ajax({
          type: "POST",
          url:  save_url,
          data: data,
          success: function(_data) {

               //reload the data
               load_do(geojson_url,reset)
            }
        });
     map_manager.map.closePopup();
}