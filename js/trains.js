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

    const template = document.createElement("template");
    template.innerHTML = `<thead><tr><th>${headings[0]}</th><th>${
        headings[1]
    }</th><th>${headings[2]}</th><th>${headings[3]}</th></tr></thead>`;

    const tHead = template.content.firstChild;
    const tBody = document.createElement("tbody");

    tableData.forEach(function(rowData) {
        let timeString = `${rowData.scheduledTime.toLocaleTimeString("fi")}`;

        if (
            rowData.actualTime.getTime() - rowData.scheduledTime.getTime() >
            1000
        ) {
            // train is late
            timeString = `${rowData.actualTime.toLocaleTimeString(
                "fi"
            )} (${timeString})`;
        }

        const template = document.createElement("template");
        template.innerHTML = `<tr><td>${rowData.code}</td><td>${
            rowData.source.stationShortCode
        }</td><td>${
            rowData.destination.stationShortCode
        }</td><td>${timeString}</td></tr>`;

        const row = template.content.firstChild;
        if (rowData.cancelled) {
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
                // filter out the station specific timetable
                return (
                    stationData.stationShortCode === stationCode &&
                    stationData.trainStopping &&
                    stationData.type === stationType
                );
            });

            if (stations.length !== 1) {
                // FIXME:
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

        tab.appendChild(buildTable(trains, isArrival));
    };
};

(function() {
    const tabcontent = document.getElementsByClassName("tabcontent");
    const tablinks = document.getElementsByClassName("tablink");

    // setup event listeners to tablinks
    for (let i = 0; i < tablinks.length; i++) {
        if (i < tabcontent.length) {
            tablinks[i].addEventListener("click", showTab(tabcontent[i].id));
        }
    }

    // open the first tab initially
    tablinks[0].click();
})();

fetch(
    "https://rata.digitraffic.fi/api/v1/live-trains/station/HKI?arrived_trains=0&arriving_trains=20&departed_trains=0&departing_trains=0&include_nonstopping=false"
)
    .then(handleResponse)
    .then(listTrains("HKI", true))
    .catch(handleError);
