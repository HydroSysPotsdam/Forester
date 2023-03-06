/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

/**
 * The project dashboard object bundles all code that is necessary to display
 * an overview of the users projects and do basic operations like adding a new
 * project, removing one or opening the editor.
 *
 * The nesting is mostly for better readability of the code.
 */
ProjectDashboard = {

    /**
     * Retrieves a list of available projects from the server and adds the
     * tiles to the dashboard.
     *
     * TODO: what happens when the project list is empty?
     *
     * @returns A promise of the list of retrieved projects.
     */
    initialize: async function () {
        const uri    = window.origin + "/api/projects"
        let projects = await fetch(uri).then(resp => resp.json())
        ProjectDashboard.createTiles(projects)
    },

    /**
     * Removes all tiles from the dashboard. They have the class
     * .forester-projects-entry.
     */
    removeAll: function () {
        d3.select(".forester-projects-list")
          .selectAll(".forester-projects-entry")
          .remove()
    },

    /**
     * Removes the tile corresponding to a project from the dashboard, if it
     * exists.
     *
     * Each tile is uniquely identified by the projects UUID
     * prefixed with #P-UUID.
     *
     * @param project A project object containing a UUID.
     */
    removeTile: function (project) {
        d3.select("#P-" + project.uuid)
          .remove()
    },

    /**
     * Initializes the project dashboard.
     *
     * The list of projects is retrieved from the server subpage `api/projects`.
     *
     * For each project, a tile is created containing some basic information like
     * name, author and size. Additionally, a thumbnail is used when it can be
     * retrieved from the server as is an indicator icon for example projects.
     *
     * TODO: validate project
     * TODO: delegate thumbnail retrieval to the server, use placeholder when none is found
     *
     * @param projects A list of projects each containing a UUID, a human-readable
     * name, an author, a size and whether the project is an example.
     *
     */
    createTiles: function (projects) {

        // clear the dashboard from all tiles
        ProjectDashboard.removeAll()

        // function to create one tile
        // called for each project
        let createTile = function (project) {

            // add the thumbnail image
            d3.select(this)
              .append("img")
              .attr("class", "forester-projects-entry-img")
              .attr("src", "../../static/img/" + project.name + ".png")

            // add the example icon if necessary
            if (project.example) {
                d3.select(this)
                  .append("img")
                  .attr("class", "forester-projects-entry-example")
                  .attr("src", "../../static/img/example.png")
            }

            // add the projects name
            d3.select(this)
              .append("span")
              .attr("class", "forester-projects-entry-title")
              .text(project.name)

            // add some project metadata
            d3.select(this)
              .append("text")
              .attr("class", "forester-projects-entry-info")
              .html(project.author + "<br>" + (new Sugar.Date(project.modified)).format("%d.%m.%y") + " | " + (new Sugar.Number(project.size)).bytes(1))

            // add a button to remove the project
            d3.select(this)
              .append("i")
              .attr("class", "fa-solid fa-trash forester-projects-entry-delete")
              // add the listener to trigger removal
              .on("click", async function (event) {
                  event.stopPropagation()
                  let shouldDelete = await showConfirmationDialog("Are you sure you want to delete the project \"" + project.name + "\"?")
                  if (shouldDelete) {
                      ProjectDashboard.remove(project)
                  }
              })

            // add the listener to open the editor
            d3.select(this)
              .on("click", (e, project) => ProjectDashboard.openEditor(project))
        }

        // create all the tiles for the project list
        d3.select(".forester-projects-list")
          .selectAll("div.forester-projects-entry")
          .data(projects)
          .enter()
          .append("div")
          .attr("id", project => "P-" + project.uuid)
          .attr("class", "forester-projects-entry")
          .each(createTile)
    },

    /**
     * Removes a project from the dashboard and sends a request to the server
     * to delete it from the database
     *
     * This is done by sending a DELETE request to the url `api/project/<UUID>`
     * When the server response with HTTP status 200 (OK), the project has successfully been
     * removed from the database. A status of 400 (Bad Request) is returned when the server
     * could not find or delete a project with this UUID.
     *
     * @param project The project that should be deleted, containing a UUID.
     */
    remove: function (project) {
        // projects are removed by sending an DELETE request to the /api/project/<uui> url
        let req = new XMLHttpRequest()
        let uri = window.origin + "/api/project/" + project.uuid
        req.open("DELETE", uri)

        // listeners for when the response of the server was loaded
        req.onload = function () {
            switch (this.status) {
                case 200: //OK
                    // remove the project tile
                    ProjectDashboard.removeTile(project)
                    break
                case 400: //Bad Request
                    showInfoDialog(this.status + " - could not remove project", "ERROR")
                    break
                default:
                    showInfoDialog(this.status + " - unknown response by the server", "ERROR")
            }
        }

        // send request
        req.send()
    },

    /**
     * Opens the editor for a given project.
     *
     * The editor may be accessed from the url `editor/<UUID>`.
     *
     * @param {project} The project that should be opened containing a UUID.
     */
    openEditor: function (project) {
        window.location = window.origin + "/editor/" + project.uuid
    }

}

/**
 * The project creation dialog bundles all code that deals with creating a new project.
 * This includes loading a file from the server, gathering some important metadata and
 * sending the file to the server for parsing.
 */
ProjectCreationDialog = {

    /**
     * Called when the project creation dialog is opened. The dialog is focussed by
     * blurring the background and reset by deleting all input from the form and disabling
     * all tabs except the first one.
     */
    onOpen: function () {
        // toggle the dialog class
        $(".forester-projects-dashboard").toggleClass("dialog-closed dialog-open")

        // reset the tabs
        $("#forester-projects-new > .tabs").tabs({disabled: [1, 2], active: 0})

        // clear the form
        document.getElementById("forester-projects-new").reset();
    },

    /**
     * Called when the project creation dialog is closed. Disables the blurring of the
     * background.
     */
    onClose: function () {
        // toggle the dialog class
        $(".forester-projects-dashboard").toggleClass("dialog-closed dialog-open")
    },

    /**
     * Called when a file is dropped or selected in the drop-area. The second tab
     * (project information form) is then opened.
     *
     * At the moment two file types are supported: json and rdata. One file type
     * can correspond to multiple training algorithms that were used to create the file.
     * Therefore, a list of supported formats is downloaded from the server, filtered
     * and displayed so that the user can select an algorithm.
     *
     * The information that is gathered in the form additionally includes a project name
     * (with a default name generated from the file-name).
     *
     * TODO: what happens when the file is invalid?
     *
     * @param {event} The event that was dispatched when the file changed.
     */
    onFileDrop: async function (event) {

        // enable the second tab
        $("#forester-projects-new > .tabs").tabs({disabled: [2], active: 1})

        // get the file that the user dropped
        const file = d3.select(".forester-projects-new-droparea").node().files[0]
        const type = file.name.split(".").slice(-1)[0]

        // download the available formats from the server and check
        // which of them fit the file
        let formats = await fetch(window.origin + "/api/formats").then(resp => resp.json())
        formats = formats.filter(format => !format.deprecated && format.type.toLowerCase() === type.toLowerCase())

        // autogenerate a project name placeholder from the file name
        d3.select("#name")
          .attr("placeholder", Sugar.String(file.name).replace(/\..*/, "").humanize())

        // show some information on the file
        const info = file.name + " (" + Sugar.Number(file.size).bytes(1) + ")"
        d3.select("#file-info span")
          .text(info)

        // function that is called when the selected format changes
        let onFormatChange = function () {

            // find the selected format
            const format = formats[d3.select("#format").node().selectedIndex]

            // update the format info
            d3.select("#format-info")
              .style("visibility", (format.note ? "visible" : "hidden"))
              .select("span")
              .html(format.note)
        }

        // remove all old options
        d3.select("#format")
          .selectAll("option")
          .remove()

        // set the format options that the user can select
        d3.select("#format")
          .on("change", onFormatChange)
          .selectAll("option")
          .data(formats)
          .enter()
          .append("option")
          .text(format => format.vendor + " - " + format.origin)

        // call format change listener once to add note for the default selection
        onFormatChange()

        // submit button for form
        $("#submit").button().click(function () {
            // get all the information from the form
            let project = {
                "file": file,
                "name": d3.select("#name").node().value,
                "format": formats[d3.select("#format").node().selectedIndex]
            }

            // use placeholder, when no name is given
            if (!project.name) {
                project.name = d3.select("#name").attr("placeholder")
            }

            // submit the new project
            ProjectCreationDialog.onFormSubmit(project)
        })
    },

    /**
     * Called when the user submits the project information form and both file and
     * form content should be transferred to the server for parsing.
     *
     * The transfer is done using a POST HTTP request to `/api/projects` with the
     * form included in the request data.
     *
     * When the server returns code 200 (OK) the project was successfully created
     * and will from now on be included in the project list. A code 500 (internal
     * server error) is returned when an error occurred during parsing. The response
     * then contains a message that describes this error. Other codes may be returned
     * but are not differentiated.
     *
     * TODO: validate project
     *
     * @param project The project containing a name, the file format and the file to
     * be parsed.
     */
    onFormSubmit: function (project) {
        // enable the third tab
        $("#forester-projects-new > .tabs").tabs({disabled: [], active: 2})

        // prepare request
        let uri = window.origin + "/api/projects"
        let req = new XMLHttpRequest()
        req.open("POST", uri)

        // add the information from the upload dialog
        let formData = new FormData();
        formData.set("name",   project.name)
        formData.set("format", JSON.stringify(project.format))
        formData.set("file",   project.file)

        req.onload = function () {

            // parse the response string
            let response = this.responseType === "json" ? JSON.parse(this.response) : this.response

            switch (this.status) {
                case 200:
                    ProjectCreationDialog.onCreationSuccess(response)
                    break;
                case 500:
                    ProjectCreationDialog.onCreationError(response)
                    break;
                default:
                    response = {message: this.status + " - unknown response from the server"}
                    ProjectCreationDialog.onCreationError(response)
                    break;
            }
        }

        // send request
        req.send(formData);
    },

    /**
     * Called when the project creation was successful.
     *
     * Displays a confirmation icon on the project creation tab and reloads
     * the project dashboard.
     *
     * @param response The response that is returned by the server. A object that contains a
     * code and message field.
     */
    onCreationSuccess: function (response) {
        // enable the third tab
        $("#forester-projects-new > .tabs").tabs({disabled: [], active: 2})

        // in the upload tab change the status indicator icon
        d3.select("#upload")
          .select(".info-icon")
          .attr("class", "info-icon fa-solid fa-check-circle fa-3x")

        // show a success message
        d3.select("#upload")
          .select(".info")
          .text("Sucess")

        // close the dialog
        $("#forester-projects-new").dialog("close")

        // reload the page
        setTimeout(ProjectDashboard.initialize, 100)
    },

    /**
     * Called when the project could not be created.
     *
     * Displays an error indicator and the error message.
     *
     * @param response The response that is returned by the server. A object that contains a
     * code and message field.
     */
    onCreationError: function (response) {
        // enable the third tab
        $("#forester-projects-new > .tabs").tabs({disabled: [], active: 2})

        // in the upload tab change the status indicator icon
        d3.select("#upload")
          .select(".info-icon")
          .attr("class", "info-icon fa-solid fa-circle-xmark fa-shake fa-3x")

        // show the error message
        if (response && response.description) {
            d3.select("#upload")
              .select(".info")
              .text(response.description)
        }
    }
}

window.showInfoDialog = function (message, status="OK") {

    $(".forester-projects-dashboard").toggleClass("dialog-closed dialog-open")

    let classes = ""
    let title = ""
    switch (status) {
        case "OK":
            classes = "fa-solid fa-check-circle"
            title = "Success"
            break;
        case "INFO":
            classes = "fa-solid fa-circle-info"
            title = "Info"
            break;
        case "CONFIRM":
            classes = "fa-solid fa-circle-question"
            title = "Confirm"
            break;
        case "WARNING":
            classes = "fa-solid fa-circle-exclamation"
            title = "Warning"
            break;
        case "ERROR":
            classes = "fa-solid fa-circle-xmark fa-shake"
            title = "Error"
            break;
    }

    let container = $("<div><div>")
        .appendTo("body")
        .dialog({
            modal: true,
            resizable: false,
            draggable: false,
            title: title,
            height: 'auto',
            buttons: {
                Ok: function () {
                    $(this).dialog("close")
                }
            },
            close: function () {
                $(".forester-projects-dashboard").toggleClass("dialog-closed dialog-open")
                $(this).remove()
            }
        })
        .addClass("forester-dialog")
        .html(message)

    container.parent().find('.ui-dialog-title').html("<i class='" + classes + "'></i><span>" + title + "</span>")

    return container;
}

window.showConfirmationDialog = function (message) {
    let dialog = showInfoDialog(message, "CONFIRM")

    return new Promise(resolve => {
        dialog.dialog({
            buttons: {
                Yes: function () {
                    $(".forester-projects-dashboard").toggleClass("dialog-closed dialog-open")
                    $(this).remove()
                    resolve(true)
                },
                No: function () {
                    $(".forester-projects-dashboard").toggleClass("dialog-closed dialog-open")
                    $(this).remove()
                    resolve(false)
                }
            },
            close: function () {
                $(".forester-projects-dashboard").toggleClass("dialog-closed dialog-open")
                $(this).remove()
                resolve(false)
            }
        })
    })
}

$(function () {

    $("#forester-projects-new").dialog({
        width: "500px",
        resizable: false,
        draggable: false,
        autoOpen: false,
        open: ProjectCreationDialog.onOpen,
        beforeClose: ProjectCreationDialog.onClose
    })

    // clicking the new project tile opens the project creation dialog
    $('.forester-projects-button-new').click(function (event) {
        $("#forester-projects-new").dialog("open")
    })

    // change in the file drop-area trigger preloading of file
    $('.forester-projects-new-droparea').change(ProjectCreationDialog.onFileDrop)

    // create the dashboard
    ProjectDashboard.initialize()
})