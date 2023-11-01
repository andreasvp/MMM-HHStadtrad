//MMM-HHStadtrad.js:

Module.register("MMM-HHStadtrad", {
    // Default module config.
    defaults: {
        updateInterval: 1000000,
        retryDelay: 5000,
        title: "Hamburg Stadtrad",
        srName: ["Hauptbahnhof / Heidi-Kabel-Platz" ],
        srCargopedelec: true,
        srShowImage: false,
    },

    // Required version of MagicMirror
    requiresVersion: "2.25.0",

    start: function () {
        Log.info("Starting module: " + this.name);

        var self = this;
        var stationData = new Map();
        var dataNotification = null;

        self.stationAssets = new Map();
        //Flag for check if module is loaded
        this.loaded = false;

        // load AssetIds for srNames
        this.loadAssetIds();

        // Schedule update timer.
        setInterval(function () {
            self.updateDom();
        }, this.config.updateInterval);
    },


    loadAssetIds: function () {
        var self = this;
        if (this.config.srName !== null) {
            this.config.srName.forEach(function (item, index) {
                Log.debug("getAssetIdForStation", index, item);
                self.getAssetIdForOneStation(index, item);
            });
        } else {
            Log.info("No srName found!");
        }
    },
    getAssetIdForOneStation: function (number, stadtradName) {
        var self = this;
        var urlApi = "https://iot.hamburg.de/v1.0/Things?$filter=description%20eq%20%27StadtRad-Station%20"+stadtradName+"%27";
        var retry = true;
        var dataAssetRequest = new XMLHttpRequest();
        dataAssetRequest.open("GET", urlApi, true);
        dataAssetRequest.onreadystatechange = function () {
            Log.debug(this.readyState);
            if (this.readyState === 4) {
                Log.debug(this.status);
                if (this.status === 200) {
                    var assetData = JSON.parse(this.response);
                    Log.info("Found AssetId");
                    Log.info(assetData.value[0].properties.assetID);
                    Log.info(stadtradName);

                    if (self.stationAssets === undefined || self.stationAssets === null) {
                        Log.info("self.stationAssets === null");
                        const mapValues = new Map();
                        mapValues.set(assetData.value[0].properties.assetID, stadtradName);
                        self.stationAssets = mapValues;
                    } else {
                        Log.info("self.stationAssets add new Set");
                        self.stationAssets.set(assetData.value[0].properties.assetID, stadtradName);
                    }
                } else if (this.status === 401) {
                    self.updateDom(self.config.animationSpeed);
                    Log.error(self.name, this.status);
                    retry = false;
                } else {
                    Log.error(self.name, "Could not load data.");
                }
                if (retry && number === 0) {
                    Log.debug("retry ", retry, " value: ", (self.loaded) ? -1 : self.config.retryDelay);
                    self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
                }
            }
        };
        dataAssetRequest.send();
    },


    /*
     * getData
     * function example return data and show it in the module wrapper
     * get a URL request
     *
     */
    getData: function () {
        var self = this;
        counter = 0;
        if (this.stationAssets !== undefined && this.stationAssets !== null) {
            this.stationAssets.forEach(function (value, key) {
                console.log("getDataForStation", key, value);
                self.getDataOneStation(counter, key, value);
                counter++;
            });
        }
    },

    getDataOneStation: function (number, stadtradID, stadtradName) {
        var self = this;
        var urlApi = "https://iot.hamburg.de/v1.0/Datastreams?$count=true&$filter=name%20eq%20%27Fahrr%C3%A4der%20an%20StadtRad-Station%20" + stadtradID +"%27";
        if (this.config.srCargopedelec) {
            urlApi = urlApi + " or name%20eq%20%27E-Lastenr%C3%A4der%20an%20StadtRad-Station%20" + stadtradID +"%27";
        }
        urlApi = urlApi + "&$expand=Observations($select=phenomenonTime,result;$orderby=phenomenonTime%20desc;$top=40)";
        var retry = true;
        var dataRequest = new XMLHttpRequest();
        dataRequest.open("GET", urlApi, true);
        dataRequest.onreadystatechange = function () {
            Log.debug(this.readyState);
            if (this.readyState === 4) {
                Log.debug(this.status);
                if (this.status === 200) {
                    self.processData(stadtradID, stadtradName, JSON.parse(this.response));
                } else if (this.status === 401) {
                    self.updateDom(self.config.animationSpeed);
                    Log.error(self.name, this.status);
                    retry = false;
                } else {
                    Log.error(self.name, "Could not load data.");
                }
                if (retry && number === 0) {
                    self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
                }
            }
        };
        dataRequest.send();
    },

    /* scheduleUpdate()
     * Schedule next update.
     *
     * argument delay number - Milliseconds before next update.
     *  If empty, this.config.updateInterval is used.
     */
    scheduleUpdate: function (delay) {
        var nextLoad = this.config.updateInterval;
        if (typeof delay !== "undefined" && delay >= 0) {
            nextLoad = delay;
        }
        nextLoad = nextLoad;
        var self = this;
        setTimeout(function () {
            self.getData();
        }, nextLoad);
    },
    // Override dom generator.
    getDom: function () {
        var self = this;

        // create element wrapper for show into the module
        var wrapper = document.createElement("div");

        const renderdDiv = document.createElement("div");

        // If this.dataRequest is not empty
        if (this.stationData) {
            var wrapperDataRequest = document.createElement("div");
            wrapperDataRequest.className = "mmm-hhstadtrad";

            // Use files for rendering
            this.nunjucksEnvironment().render("HHStadtrad.njk", {config: this.config, mapValues: this.stationData}, function (err, res) {
                if (err) {
                    console.log(err);
                }
                renderdDiv.innerHTML = res;
            });
            wrapper.appendChild(renderdDiv);
        }
        return wrapper;
    },
    getScripts: function () {
        return [];
    },
    getStyles: function () {
        return [
            "MMM-HHStadtrad.css",
        ];
    },
    // Load translations files
    getTranslations: function () {
        return {};
    },
    processData: function (stadtradid, stadtradName, data) {
        var self = this;

        var resultData = {
            "stationName" : stadtradName,
            "Fahrrad": {
                "count": 0,
                "hist": []
            },
            "Lastenrad": {
                "count": 0,
                "hist": []
            },
        };

        for (let i = 0; i < data.value.length; i++) {

            // Fahrräder
            if (data.value[i].name.startsWith("Fahrräder")) {
                Log.debug("Found Fahrrad for ", data.value[i].name);
                Log.debug(data.value[i]);
                resultData.Fahrrad.count = data.value[i].Observations[0].result;
                for (let observ = 0; observ < data.value[i].Observations.length; observ++) {
                    Log.debug(data.value[i].Observations[observ].result);
                    resultData.Fahrrad.hist[observ] = data.value[i].Observations[observ].result
                }
            }
            // E-Lastenräder
            if (data.value[i].name.startsWith("E-Lastenräder")) {
                Log.debug("Found E-Lastenräder for ", data.value[i].name);
                Log.debug(data.value[i]);
                resultData.Lastenrad.count = data.value[i].Observations[0].result;
                for (let observ = 0; observ < data.value[i].Observations.length; observ++) {
                    resultData.Lastenrad.hist[observ] = data.value[i].Observations[observ].result
                }
            }
        }

        if (typeof this.stationData === "undefined") {
            Log.debug("this.stationData === null");
            const mapValues = new Map();
            mapValues.set(stadtradid, resultData);
            this.stationData = mapValues;
        } else {
            Log.debug("this.stationData add new Set");
            this.stationData.set(stadtradid, resultData);
        }

        Log.info("Station count : ", this.stationData.size);

        self.updateDom(self.config.animationSpeed);
        this.loaded = true;
    },
});
