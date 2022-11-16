/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

createProjectDashboard = function (projects) {
    d3.select(".forester-projects-list")
      .selectAll("div")
      .data(projects)
      .enter()
      .append("div")
      .attr("id", project => "P-" + project.uuid)
      .attr("class", "forester-projects-entry")
      .each(function (project) {
          d3.select(this)
            .append("img")
            .attr("class", "forester-projects-entry-img")
            .attr("src", "../../static/img/" + project.name + ".png")

          if (project.example) {
              d3.select(this)
                .append("img")
                .attr("class", "forester-projects-entry-example")
                .attr("src", "../../static/img/example.png")
          }

          d3.select(this)
            .append("span")
            .attr("class", "forester-projects-entry-title")
            .text(project.name)

          d3.select(this)
            .append("text")
            .attr("class", "forester-projects-entry-info")
            .html(project.author + "<br>" + (new Sugar.Date(project.modified)).format("%d.%m.%y") + " | " + (new Sugar.Number(project.size)).bytes(1))

          d3.select(this)
              .append("i")
              .attr("class", "fa-solid fa-trash forester-projects-entry-delete")
              .on("mouseover", function () {
                  d3.select(this)
                    .style("transform", "scale(1.1) rotate(" + 10*Math.sign(Math.random() - 0.5) + "deg)")
              })
              .on("mouseout", function () {
                  d3.select(this)
                    .style("transform", "none")
              })
              .on("click", function (event) {
                  event.stopPropagation()
                  let shouldDelete = confirm("Are you sure you want to delete the project \"" + project.name + "\"?")
                  if (shouldDelete) {
                      removeProject(project)
                  }
              })
      })
      .on("click", function (event, project) {
          window.location = window.origin + "/editor/" + project.uuid
      })
}

UploadForm = {

    onHoverFile: function (event) {
        event.preventDefault()
        console.log("Hovering file")
    },

    onDropFile: function (event) {
        event.preventDefault()
        console.log("Dropping file")

        let file
        if (event.dataTransfer.items) {
            let item = event.dataTransfer.items[0]
            if (item.kind === 'file') {
                file = item.getAsFile()
            }
        } else {
            file = event.dataTransfer.files[0]
        }

        UploadForm.start(file)
    },

    start: function (file) {

        // disable other tabs
        $("#forester-projects-new > .tabs").tabs({disabled: [1, 2]})

        let format = file['name'].split(".").slice(-1)

        let options
        switch (format) {
            case "json":
                options = ["Forester Project", "Matlab's fitctree"]
                break
            case "rdata":
                options = ["R's rpart"]
                break
            default:
                options = ["", "Forester Project", "Matlab's fitctree", "R's rpart"]
                break
        }

        // change the drop area to display the file name
        d3.select(".forester-projects-new-droparea")
          .text(file['name'])

        // enable the second tab
        $("#forester-projects-new > .tabs").tabs({disabled: [2], active: 1})


        // set the options for format
        d3.select("#format")
          .selectAll("option")
          .data(options)
          .enter()
          .append("option")
          .text(o => o)

        // auto set the created field
        d3.select("#created")
          .attr("valueAsDate", new Date(file['lastModified']).toDateInputValue())

        console.log(format, options, file)
    },
}

removeProject = function (project) {
    // projects are removed by sending an DELETE request to the /api/project/<uui> url
    let req = new XMLHttpRequest()
    let uri = window.origin + "/api/project/" + project.uuid
    req.open("DELETE", uri)
    req.send()

    // when the server returns 200, the project has successfully been deleted
    // when the server returns 404, the project was not found and therefore not deleted
    // when the
    req.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            // remove the project tile
            d3.select("#P-" + project.uuid)
              .remove()
        } else {
            prompt(this.status + " - could not remove project!")
        }
    }
}

$(function () {
    $("#forester-projects-new").dialog({
        width: "500px",
        resizable: false
        // scroll: false
    })

    $("#forester-projects-new > .tabs").tabs({
        disabled: [1, 2]
    })
})

window.onload = function () {
    fetch(window.origin + "/api/projects")
        .then(response => response.json())
        .then(projects => createProjectDashboard(projects))
}