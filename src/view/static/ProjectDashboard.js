/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

ProjectDashboard = {

    /**
     * Retrieves a list of available projects from the server and
     * opens the dashboard with them.
     *
     * @returns A promise of the list of retrieved projects.
     */
    initialize: async function () {
        const uri    = window.origin + "/api/projects"
        let projects = await fetch(uri).then(resp => resp.json())
        ProjectDashboard.createTiles(projects)
    },

    /**
     * Clears all tiles from the project dashboard.
     */
    removeAll: function () {
        d3.select(".forester-projects-list")
          .selectAll(".forester-projects-entry")
          .remove()
    },

    /**
     *
     */
    removeTile: function (project) {
        d3.select("#P-" + project.uuid)
          .remove()
    },

    /**
     * Initializes the project dashboard from a list of projects.
     */
    createTiles: function (projects) {

        // clear the dashboard from all tiles
        ProjectDashboard.removeAll()

        // function to create one tile
        // called for each project
        let createTile = function (project) {
            // TODO: validate project

            // add the thumbnail image
            // TODO: delegate this to the server
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
              .on("click", function (event) {
                  event.stopPropagation()
                  //TODO: more pretty confirmation dialog?
                  let shouldDelete = confirm("Are you sure you want to delete the project \"" + project.name + "\"?")
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
     * to delete it.
     */
    remove: function (project) {
        // projects are removed by sending an DELETE request to the /api/project/<uui> url
        let req = new XMLHttpRequest()
        let uri = window.origin + "/api/project/" + project.uuid
        req.open("DELETE", uri)

        // listeners for when the response of the server was loaded
        req.onload = function () {
            // TODO: pretty up the dialogs
            switch (this.status) {
                case 200:
                    // remove the project tile
                    ProjectDashboard.removeTile(project)
                    break
                case 400:
                    alert(this.status + " - could not remove project")
                    break
                default:
                    alert(this.status + " - unknown response by the server")
            }
        }

        // send request
        req.send()
    },

    openEditor: function (project) {
        window.location = window.origin + "/editor/" + project.uuid
    }

}

ProjectCreationDialog = {

    onOpen: function () {
        // toggle the dialog class
        $(".forester-projects-dashboard").toggleClass("dialog-closed dialog-open")

        // reset the tabs
        $("#forester-projects-new > .tabs").tabs({disabled: [1, 2], active: 0})

        // clear the form
        document.getElementById("forester-projects-new").reset();
    },

    onClose: function () {
        // toggle the dialog class
        $(".forester-projects-dashboard").toggleClass("dialog-closed dialog-open")
    },

    onFileDrop: async function (event) {

        // enable the second tab
        $("#forester-projects-new > .tabs").tabs({disabled: [2], active: 1})

        // get the file that the user dropped
        // TODO: what happens when the file is invalid?
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
              .text(format.note)
        }

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

    onFormSubmit: function (project) {
        // enable the third tab
        $("#forester-projects-new > .tabs").tabs({disabled: [], active: 2})

        // prepare request
        let uri = window.origin + "/api/projects"
        let req = new XMLHttpRequest()
        req.open("POST", uri)

        // TODO: validate project

        // add the information from the upload dialog
        let formData = new FormData();
        formData.set("name",   project.name)
        formData.set("format", JSON.stringify(project.format))
        formData.set("file",   project.file)

        req.onload = function () {

            // parse the response string
            let response = JSON.parse(this.response)

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

    onCreationSuccess: function (response) {
        // in the upload tab change the status indicator icon
        d3.select("#upload")
          .select(".info-icon")
          .attr("class", "info-icon fa-solid fa-check-circle fa-shake fa-3x")

        // show a success message
        d3.select("#upload")
          .select(".info")
          .text("Sucess")

        // reload the page
        // TODO: replace this by closing the dialog and reloading the dashboard
        setTimeout(() => location.reload(), 100)
    },

    onCreationError: function (response) {
        // TODO: check whether the dialog is visible and the tab available

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