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
