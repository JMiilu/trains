"use strict";

const showTab = function(tabId) {
    const tabcontent = document.getElementsByClassName("tabcontent");
    const tablinks = document.getElementsByClassName("tablink");

    return function(evt) {
        // Hide all elements with class="tabcontent"
        for (let i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }

        // Remove the class "active" from all elements with class="tablink"
        for (let i = 0; i < tablinks.length; i++) {
            tablinks[i].classList.remove("active");
        }

        // Show the current tab, and add an "active" class to the button that opened the tab
        document.getElementById(tabId).style.display = "block";
        evt.currentTarget.classList.add("active");
    };
};

const handleResponse = function(response) {
    const contentType = response.headers.get("content-type");

    if (!contentType.includes("application/json")) {
        throw new Error(`Sorry, content-type '${contentType}' not supported`);
    }

    if (!response.ok) {
        return Promise.reject({
            status: response.status,
            statusText: response.statusText
        });
    }
    return response.json();
};

const handleError = function(error) {
    // TODO: show a proper error message to the user
    console.table(error);
};

const buildTable = function(tableData, isArrival) {
    // build html table from train data
    const headings = isArrival
        ? ["Juna", "Lähtöasema", "Pääteasema", "Saapuu"]
        : ["Juna", "Lähtöasema", "Pääteasema", "Lähtee"];

    // use template element to create domNodes from html
    // (see: https://stackoverflow.com/a/35385518)
    const template = document.createElement("template");
    template.innerHTML = `<thead><tr><th>${headings[0]}</th><th>${
        headings[1]
    }</th><th>${headings[2]}</th><th>${headings[3]}</th></tr></thead>`;

    const tHead = template.content.firstChild;
    const tBody = document.createElement("tbody");

    tableData.forEach(function(rowData) {
        let timeString = `${rowData.scheduledTime.toTimeString().substr(0, 5)}`;

        if (
            rowData.actualTime.getTime() - rowData.scheduledTime.getTime() >
            1000
        ) {
            // the train is late
            timeString = `${rowData.actualTime
                .toTimeString()
                .substr(0, 5)} (${timeString})`;
        }

        // use template element to create domNodes from html
        // (see: https://stackoverflow.com/a/35385518)
        const template = document.createElement("template");
        template.innerHTML = `<tr><td>${rowData.code}</td><td>${
            rowData.source.stationShortCode
        }</td><td>${
            rowData.destination.stationShortCode
        }</td><td>${timeString}</td></tr>`;

        const row = template.content.firstChild;

        if (rowData.cancelled) {
            // train is cancelled
            row.classList.add("cancelled");
        }
        tBody.appendChild(row);
    });

    const table = document.createElement("table");
    table.appendChild(tHead);
    table.appendChild(tBody);
    return table;
};

const listTrains = function(stationCode, isArrival) {
    const tab = document.getElementById(isArrival ? "arrivals" : "departures");

    const stationType = isArrival ? "ARRIVAL" : "DEPARTURE";
    const trains = [];

    return function(fetchedData) {
        fetchedData.forEach(function(trainData) {
            const [sourceStation, destinationStation] = [
                trainData.timeTableRows[0],
                trainData.timeTableRows[trainData.timeTableRows.length - 1]
            ];

            const stations = trainData.timeTableRows.filter(function(
                stationData
            ) {
                // filter out the station specific timetable row
                return (
                    stationData.stationShortCode === stationCode &&
                    stationData.trainStopping &&
                    stationData.type === stationType
                );
            });

            if (stations.length !== 1) {
                // FIXME: do something smarter
                // train should only arrive/depart a station once
                // skip this weird train
                return;
            }

            const scheduledTime = new Date(stations[0].scheduledTime);
            const actualTime =
                typeof stations[0].actualTime === "undefined"
                    ? scheduledTime
                    : new Date(stations[0].actualTime);

            const train = {
                code: `${trainData.trainType} ${trainData.trainNumber}`,
                cancelled: trainData.cancelled,
                scheduledTime: scheduledTime,
                actualTime: actualTime,
                source: sourceStation,
                destination: destinationStation
            };

            trains.push(train);
        });

        tab.replaceChild(buildTable(trains, isArrival), tab.firstChild);
    };
};

const setupStationsList = function(stationData) {
    // setup a datalist for station input field
    // TODO: hide station codes from user and allow user to type full station name
    // TODO: implement autocomplete (see: https://www.w3schools.com/howto/howto_js_autocomplete.asp)
    const form = document.getElementsByTagName("form")[0];
    const stationInput = document.getElementById("station");
    const dataList = document.createElement("datalist");

    stationData.forEach(function(station) {
        if (!station.passengerTraffic) {
            return;
        }

        const option = document.createElement("option");
        option.value = station.stationShortCode;
        option.innerText = station.stationName;
        dataList.appendChild(option);
    });

    dataList.id = "stationlist";
    stationInput.setAttribute("list", dataList.id);
    form.appendChild(dataList);
};

(function() {
    const tabcontent = document.getElementsByClassName("tabcontent");
    const tablinks = document.getElementsByClassName("tablink");
    const form = document.getElementsByTagName("form")[0];

    // setup event listeners to tablinks (assume that tablinks and tabcontents are in the same order)
    for (let i = 0; i < tablinks.length; i++) {
        if (i < tabcontent.length) {
            // only add event listener if there is corresponding content section
            tablinks[i].addEventListener("click", showTab(tabcontent[i].id));
        }
    }

    // open the first tab initially
    tablinks[0].click();

    // fetch stations
    // TODO: implement autocomplete (see: https://www.w3schools.com/howto/howto_js_autocomplete.asp)
    fetch("https://rata.digitraffic.fi/api/v1/metadata/stations")
        .then(handleResponse)
        .then(setupStationsList)
        .catch(handleError);

    form.addEventListener("submit", function(evt) {
        // prevent form submit
        evt.preventDefault();

        const station = document.getElementById("station");

        // TODO: check active tab (arrivals or departures) and search data first for that tab

        // fetch arrivals
        fetch(
            `https://rata.digitraffic.fi/api/v1/live-trains/station/${
                station.value
            }?arrived_trains=0&arriving_trains=10&departed_trains=0&departing_trains=0&include_nonstopping=false`
        )
            .then(handleResponse)
            .then(listTrains(station.value, true))
            .catch(handleError);

        // fetch departures
        fetch(
            `https://rata.digitraffic.fi/api/v1/live-trains/station/${
                station.value
            }?arrived_trains=0&arriving_trains=0&departed_trains=0&departing_trains=10&include_nonstopping=false`
        )
            .then(handleResponse)
            .then(listTrains(station.value, false))
            .catch(handleError);
    });
})();
