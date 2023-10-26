//MMM-HHStadtrad.js:

Module.register("MMM-HHStadtrad", {
    // Default module config.
    defaults: {
        text: "Hello World!",
        showImage: true,
    },

    // Override dom generator.
    getDom: function () {
        var wrapper = document.createElement("div");
        wrapper.innerHTML = this.config.text;

        if (this.defaults.showImage === true) {
            var elem = document.createElement("img");
            elem.src = "modules/MMM-HHStadtrad/public/Icon.png";
            elem.height = 50;

            wrapper.appendChild(elem);
        }

        return wrapper;
    },
});
