
/**
 * Created by wsiddall on 26/08/2014.
 * Maintained by seor since 02/10/2015.
 */
var debug = true;
var locException = [];

/*** Interface functions ***/
if (!(typeof avaIFaceJS === 'undefined')) {

    avaIFaceJS.sdb_func = {
        init: function() {

            $('#report_body').css({marginTop: '+=30px'});
            locException.push({ riverCode: "FSD",
                                re: /Fraser\sSurrey\sDocks/});

            avaIFaceJS.sdb_func.fillChannel(); // populate dropdowns on load

            /** Event Handlers **/
            // Load and fill channel drop down
            $('#sdb_waterway').change(function(){
                avaIFaceJS.setMapOpen(avaIFaceJS.MapState.Open);
                avaIFaceJS.sdb_func.fillChannel();
                // avaIFaceJS.sdb_func.update();
            });

            // Load and fill location drop down
            // $('#channel').change(avaIFaceJS.sdb_func.fillLocation);

            // Colour and resize map extents when waterway field changes
            $('#sdb_waterway').change(function() {
                avaIFaceJS.mapJS.sdb_func.setExtents($(this).val());
                return $('#map').css("min-height", "400px");
            });

            // Colour and resize map, and fill location drop down when channel field changes
            $('#channel').change(function() {
                avaIFaceJS.mapJS.sdb_func.refreshLocation("");
                // console.profile("channel change event");
                avaIFaceJS.mapJS.sdb_func.setChannelExtents($('#sdb_waterway').val(), $(this).val()); // Broken?
                avaIFaceJS.sdb_func.fillLocation();
                // console.profileEnd();
                return $('#map').css("min-height", "400px");
            });

            // Colour Tiles when location field changes
            $('#location').change(function() {
                return avaIFaceJS.mapJS.sdb_func.refreshLocation($(this).val());
            });

            $('#type').change(function() {
                avaIFaceJS.sdb_func.update();
            });

            // Submit form
            $("#submit").click(function() {
                return avaIFaceJS.sdb_func.update();
            });

        },

        // Load and fill channel drop down
        fillChannel: function() {
            $('#location option').remove();
            $('#channel option').remove();
            $('#channel').append('<option></option>');
            return $.each(incl_ava_defs.locDefs[$('#sdb_waterway').val()]['Sections'], function() {
                return $('#channel').append("<option value='" + this.Form.Key + "'>" + this.Form.Title + "</option>");
            });
        },

        // Load and fill location drop down
        fillLocation: function() {
            locationDropdownFilled = true;
            $('#location option').remove();
            $('#location').append('<option></option>');
            if (debug) {
                console.log("void fillLocation(): sdb_waterway=" + $('#sdb_waterway').val());
                console.log("void fillLocation(): channel=" + $('#channel').val());
            }
            try {
                return $.each(incl_ava_defs.locDefs[$('#sdb_waterway').val()]['Sections'][$('#channel').val()]['Names'], function() {
                    return $('#location').append("<option value='" + this["Location Name"] + "'>" + this["Location Name"] + "</option>");
                });
            } catch (err) {
                if (debug) console.log("void fillLocation(): No location defined for channel " + $('#channel').val());
                return;
            }
        },

        // process report content and update window
        update: function(tileName) {
            $('.spinner').show();
            if(debug) console.log("void update(tileName = " + tileName + ")");

            var header, wat, chann, location, type;
            wat = $('#sdb_waterway :selected').text();
            chann = $('#channel :selected').text();
            location = $('#location :selected').text();
            type = $('#type :selected').text(); 

            var apiBase = "http://whistler:82/api2/SurveyDrawings?";
            var apiParams = [];

            //if tile has been clicked on map, query all drawings under clicked tile
            if(tileName != undefined)
            {
                apiParams.push("Tile_A=", tileName);
            }
            // if no channel selected, query all drawings under selected waterway
            else if(chann == "")
            {
                apiParams.push("River=", wat);
            }
            // else, a channel has been selected
            else
            {
                var riverVal = $('#sdb_waterway').val();
                var channelVal = $('#channel').val();
                var locationVal = $('#location').val();
                var tile;
                var channelStruct = incl_ava_defs.locDefs[riverVal]["Sections"][channelVal];

                //if a location hasn't been selected, get all drawings listed under channel 
                if(location == "")
                {
                    //if the channel has its own tile, query for drawings under that tile
                    if(channelStruct["Form"].hasOwnProperty("Tile"))
                    {
                        tile = channelStruct["Form"]["Tile"];
                        apiParams.push("Tile_A=", tile);
                    }
                    //else, query for all drawings under selected river-channel 
                    else apiParams.push("River=", wat, "&Channel=", chann);
                }
                //else, if a location has been selected and the channel contains locations in the local definition...
                else if(channelStruct["Names"] != "")
                {
                    //find the location's tile and query drawings under that tile
                    for(var i = 0; i < channelStruct["Names"].length; i++)
                    {
                        var curLoc = channelStruct["Names"][i];
                        if(curLoc["Location Name"] == locationVal)
                        {
                            tile = curLoc["Tile"];
                            break;
                        }
                    }
                    apiParams.push("Tile_A=", tile);
                }
            }
            if(type != "") apiParams.push("&Type=", type);

            if(apiParams.length != 0) 
            {
                apiURL = apiBase + apiParams.join("");
                if (debug) console.log("update() is calling: " + apiURL);
                $('#spinner').show();

                return $.getJSON(getAPI(apiURL, ""), function(data) {
                    // set report title
                    if (window.location.href.indexOf("fra") > -1) { //If url contains 'fra' use
                        header = "Enquêtes Résultats de la recherche";
                    } else {
                        header = "Surveys Search Results";
                    }

                    var title = (chann == "")? (wat) : (wat + " - " + chann); 
                    if(location != "") location = "At " + location;

                    avaIFaceJS.reportWindow.addTitle(header, title, location);

                    avaIFaceJS.sdb_func.tableReport || (avaIFaceJS.sdb_func.tableReport = $('#report_tbl').DataTable({
                        bPaginate: false,
                        bInfo: false,
                        bSort: false,
                        bFilter: false
                    }));
                    avaIFaceJS.sdb_func.tableReport.clear();
                    $('#report_tbl tbody tr').remove();
                    $.each(data, function() {
                        avaIFaceJS.sdb_func.tableReport.row.add(
                            [this.yyyy_mm_dd,
                            (this.Svy_Filename.indexOf('pdf') > -1 || this.Type.indexOf('pdf') > -1) ?
                            "<a href='http://www2.pac.dfo-mpo.gc.ca/Data/dwf/" + this.Filename + ".pdf' target='_blank'>" + this.Svy_Filename + "</a>":
                            "<a href='http://www2.pac.dfo-mpo.gc.ca/Data/dwf/" + this.Filename + ".dwf?' target='_blank'>" + this.Filename + "</a>",
                                this.Location,
                                this.Type,
                                this.KMstart,
                                this.KMend
                            ]);
                    });
                    avaIFaceJS.sdb_func.tableReport.draw();
                    $('#report_tbl tbody tr td:nth-last-child(2), #report_tbl tbody tr td:nth-last-child(1)').each(function() {
                        $(this).css('text-align', 'right');
                    });
                    if(debug) console.log("Closing map");
                    avaIFaceJS.setMapOpen(avaIFaceJS.MapState.Close);
                    avaIFaceJS.reportWindow.show();
                }).done(function() {
                    $('.spinner').hide();
                    // pBarToggle();
                    });
            }
            else $('.spinner').hide();
        },

        // update parameter bar from map selected channel
        updateParameters: (function(jsonData) {
            if(debug) console.log("void updateParameters: \n");
            console.log(jsonData);
            var data = jsonData.data
            switch (data.waterway) {
                case "FRMA":
                case "FRMA_SC":
                case "FRNA":
                case "FRNA_SC":
                case "FRPR":
                case "FRSA":
                case "FRSA_SC":
                case "FRUR":
                    $('#sdb_waterway').val("FR");
                    break;
                case "POV":
                    $('#sdb_waterway').val("POV");
                    avaIFaceJS.sdb_func.fillChannel();
                    $('#channel').val("POV_BI");
                    avaIFaceJS.sdb_func.fillLocation();
                    return;
                case "FSD":
                    $('#sdb_waterway').val("FR");
                    avaIFaceJS.sdb_func.fillChannel();
                    $('#channel').val("FRSA");
                    avaIFaceJS.sdb_func.fillLocation();
                    $('#location').val(data.location);
                    return;
                default:
                    $('#sdb_waterway').val("CWC");
            }
            if ((/WS*/).test(data.waterway)) $('#sdb_waterway').val("WS");
            if ((/IN*/).test(data.waterway)) $('#sdb_waterway').val("IW");

            avaIFaceJS.sdb_func.fillChannel();
            $('#channel').val(data.waterway);
            avaIFaceJS.sdb_func.fillLocation();
            // $('#location').text(data.location);
            $('#location').val(data.location);
        }),
    };
} else if (!(typeof avaMapJS === 'undefined')) {
    /*** Map Interaction functions ***/
    avaMapJS.sdb_func = {
        // init function for loading custom tile file and other events
        init: function() {
            // Setting up place-holder variables
            avaMapJS.sdb_func.curWaterway = "";
            avaMapJS.sdb_func.curLocation = "";

            // KML Feature Styles and KML Layer
            mapStyle.callback_function = avaMapJS.sdb_func.checkTileRefresh;
            avaMapJS.sdb_func.kml = new OpenLayers.Layer.Vector("KML", {
                strategies: [new OpenLayers.Strategy.Fixed()],
                projection: avaMapJS.map.displayProjection,
                renderers: avaMapJS.renderer,
                styleMap: mapStyle.area_with_label("${location}"),
                protocol: new OpenLayers.Protocol.HTTP({
                    url: "sdb_tiles.kml?",
                    format: new OpenLayers.Format.KML({
                        extractStyles: false,
                        extractAttributes: true,
                        maxDepth: 2
                    })
                })
            });
            avaMapJS.setMapLayer(avaMapJS.sdb_func.kml);

            // Map Interaction parameters
            avaMapJS.sdb_func.HLFeat = new OpenLayers.Control.SelectFeature(avaMapJS.sdb_func.kml, {
                hover: false,
                toggle: false,
                clickout: true,
                multiple: false,
                toggleKey: "ctrlKey",
                multipleKey: "shiftKey"
            });
            avaMapJS.setMapControls([avaMapJS.sdb_func.HLFeat]);
            avaMapJS.sdb_func.HLFeat.activate();
            avaMapJS.sdb_func.HLFeat.handlers.feature.stopDown = false;
            avaMapJS.sdb_func.kml.events.on({
                'featureselected': avaMapJS.sdb_func.tileSelect,
                'featureunselected': avaMapJS.sdb_func.tileUnselect
            });

            // Sets extents of map
            avaMapJS.sdb_func.setExtents("FR");
        },

        /*** Page-specific functions ***/
        // setExtents: Using the name of provided Waterways selector, draw extents from 'locationExtents' dict.
        setExtents: function(waterway) {
            if (!waterway) {
                return;
            }
            var obj = incl_ava_defs.locDefs[waterway].Coords;
            try {
                avaMapJS.map.zoomToExtent(new OpenLayers.Bounds(obj.Lon.min, obj.Lat.min, obj.Lon.max, obj.Lat.max));
            } catch (err) {
                if (debug) console.log("void setExtents(): " + err);
            }
        },

        // page specific
        setChannelExtents: function(waterway, channel) {
            if (!channel || !waterway) {
                if (debug) console.log("void setChannelExtents(): Both channel and waterway needs to be defined");
                return;
            }

            var obj = incl_ava_defs.locDefs[waterway]['Sections'][channel].Coords;
            if (debug) {
                console.log("void setChannelExtents(): minLat=" + obj.Lat.min);
                console.log("void setChannelExtents(): maxLat=" + obj.Lat.max);
                console.log("void setChannelExtents(): minLon=" + obj.Lon.min);
                console.log("void setChannelExtents(): maxLon=" + obj.Lon.max);
                console.log("void setChannelExtents(): channel=" + channel);
            }

            try {
                avaMapJS.map.zoomToExtent(new OpenLayers.Bounds(obj.Lon.min, obj.Lat.min, obj.Lon.max, obj.Lat.max));
            } catch (err) {
                if (debug) console.log("void setChannelExtents(): " + err);
            }
            avaMapJS.sdb_func.refreshTiles(channel, "");
        },

        setExtentsLatLon : function(obj) {
            try {
                // LatLon to Spherical Mercator projection
                var proj = new OpenLayers.Projection("EPSG:4326");
                var targetProj = new OpenLayers.Projection("EPSG:3857");
                var box = new OpenLayers.Bounds(obj.Lon.min, obj.Lat.min, obj.Lon.max, obj.Lat.max);
                box.transform(proj, targetProj);
                avaMapJS.map.zoomToExtent(box);
            } catch (err) {
                if (debug) console.log("void setExtentsLatLon(): " + err);
            }
        },

        /**
         * Convert LatLon to Spherical Mercator Projection in console
         * @param  {[Array]} obj [minLon, minLat, maxLon, maxLat]
         * @return {[Object]}     [OpenLayers.Bounds object]
         */
        projectLatLon : function(obj) {
            // LatLon to Spherical Mercator projection
            var proj = new OpenLayers.Projection("EPSG:4326");
            var targetProj = new OpenLayers.Projection("EPSG:3857");
            var box = new OpenLayers.Bounds(obj[0], obj[1], obj[2], obj[3]);
            box.transform(proj, targetProj);
            console.log("Lat min/max: " + Math.round(box.bottom) + " & " + Math.round(box.top));
            console.log("Lon min/max: " + Math.round(box.left) + " & " + Math.round(box.right));
            return box;
        },

        tileUnselect: function(tile) {
            if (tile.feature.data.location == avaMapJS.sdb_func.curLocation) {
                avaMapJS.sdb_func.curLocation = "";
                avaMapJS.sdb_func.curWaterway = "";
            }
        },

        // tileSelect: callBack function for tile selection from the map interface
        tileSelect: function(tile) {
            var tileName = tile.feature.data.name;
            if (debug) {
                console.log("void tileSelect(): " + tileName);
                console.log("void tileSelect(): " + tile.feature.data);
                console.log(tile.feature.data);
            }
            if (tileName.indexOf('/') >= 0) {
                parent.window.open("http://www2.pac.dfo-mpo.gc.ca" + tileName, '_blank');
                parent.avaIFaceJS.sdb_func.update(); // refresh page from updated parameters
            } else {
                parent.avaIFaceJS.sdb_func.updateParameters({
                    "data": tile.feature.data
                });
                parent.avaIFaceJS.sdb_func.update(tileName); // refresh page from updated parameters
            }
        },

        // refreshTiles: function to refresh the draw of the tile layer using the new selected form settings
        refreshTiles: function(channel, location) {
            if(debug) console.log("void refreshTiles()");
            avaMapJS.sdb_func.curWaterway = channel;
            avaMapJS.sdb_func.curLocation = location;
            if (location == "") {
                avaMapJS.sdb_func.kml.redraw();
            }
            parent.avaIFaceJS.sdb_func.update();
        },

        /**
         * [refreshLocation refresh the layer with new selected feature]
         * @param  {[String]} location [the string value of location to highlight]
         * @return {[void]}
         */
        refreshLocation : function(location) {
            if(debug) console.log("refreshLocation(" + location + ")");
            this.checkRemainingFeaturesOnLayer();
            if (location != "") {
                var featureToSelect = this.getFeaturesByLocation(location);
                if (featureToSelect != -1) this.HLFeat.select(featureToSelect);
                else parent.avaIFaceJS.sdb_func.update();
            }
            else parent.avaIFaceJS.sdb_func.update();
            avaMapJS.sdb_func.kml.redraw();
        },

        /**
         * [getFeaturesByLocation return an array of features that contain passed location]
         * @param  {[String]} location [a location to search inside the vector]
         * @return {[Object]}          [feature object]
         */
        getFeaturesByLocation : function(location) {
            if(debug) console.log("getFeaturesByLocation(" + location + ")");
            var features = this.kml.features;
            for (var i = 0; i < features.length; i++) {
                var data = features[i].data.location;
                var regEx = new RegExp(location);
                var start = /^/;
                regEx = (start.source + regEx.source);
                if (data.search(regEx) > -1) return features[i];
            }
            return -1;
        },

        /**
         * [checkRemainingFeaturesOnLayer Check if features are remaining on the layer, and remove them if they are]
         * @return {[Boolean]}          [return true if the function executes successfully]
         */
        checkRemainingFeaturesOnLayer : function() {
            if(debug) console.log("checkRemainingFeaturesOnLayer()\n");
            var selectedFeatures = this.getSelectedFeatures();
            if (selectedFeatures.length == 0) {
                return true;
            } else if (selectedFeatures.length > 0) {
                this.unselectSelectedFeaturesOnLayer(selectedFeatures);
                return true;
            }
            return false;
        },

        /**
         * [unselectSelectedFeaturesOnLayer unselect all features on the layer]
         * @param  {[Array]} features [all selected feature objects in an array]
         * @return {[void]}
         */
        unselectSelectedFeaturesOnLayer : function(features) {
            for (var i = 0; i < features.length; i++) {
                this.unselectAFeatureOnLayer(features[i]);
            }
        },

        /**
         * [unselectFeatureOnLayer unselect a feature on the layer by giving an ID of the vector layer element]
         * @param  {[String]} feature [a feature]
         * @return {[void]}
         */
        unselectAFeatureOnLayer : function(feature) {
            this.HLFeat.unselect(feature);
        },

        /**
         * [getSelectedFeatures get all selected features]
         * @return {[Array]} [all selected feature objects in an array]
         */
        getSelectedFeatures : function() {
            return this.kml.selectedFeatures;
        },

        // checkTileRefresh: checks if the tile's attributes match the currently selected values
        checkTileRefresh: function(feat) {
            var temp;
            if (window.location.href.indexOf("fra") > -1) {
                //If url contains 'fra' use
                if (avaMapJS.sdb_func.curLocation.length > 0 && avaMapJS.sdb_func.curLocation != " - Aperçu du chenal") {
                    temp = feat.data.location == avaMapJS.sdb_func.curLocation;
                } else {
                    temp = true;
                }
            } else {
                //If url does not contain 'fra' use
                if (avaMapJS.sdb_func.curLocation.length > 0 && avaMapJS.sdb_func.curLocation != "Channel Overview") {
                    temp = feat.data.location == avaMapJS.sdb_func.curLocation;
                } else {
                    temp = true;
                }
            }
            return temp && (feat.data.waterway == avaMapJS.sdb_func.curWaterway)
        }
    };
} else if (!(typeof avaMapDetJS === 'undefined')) {
    avaMapDetJS.sdb_func = {
        init: function() {}
    };
};

function assert(condition, message) {
    if(!condition) {
        message = message || "Assertion failed.";
        if (typeof Error !== "undefined") throw new Error(message);
        throw message;
    }
}
