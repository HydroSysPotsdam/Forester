/*
 * CC-0 2022.
 * David Strahl, University of Potsdam
 * Forester: Interactive human-in-the-loop web-based visualization of machine learning trees
 */

createProjectDashboard = function (projects) {
    d3.select(".forester-projects-list")
      .selectAll("div.forester-projects-entry")
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

preloadFile = async function (event) {
    console.log("Loading file")

    const file = d3.select(".forester-projects-new-droparea").node().files[0]
    console.log(file)
    const type = file.name.split(".").slice(-1)[0]
    console.log(type)

    let formats = await fetch(window.origin + "/api/formats").then(resp => resp.json())

    formats = formats.filter(format => !format.deprecated && format.type.toLowerCase() === type.toLowerCase())
    console.log(formats)

    // enable the second tab
    $("#forester-projects-new > .tabs").tabs({disabled: [2], active: 1})

    // set the file info
    d3.select("#fileinfo")
      .html("<span class='fa-solid fa-file-circle-check'></span> " + file.name + " (" + Sugar.Number(file.size).bytes(1) + ")")

    // update the projects name
    d3.select("#name")
      .attr("placeholder", Sugar.String(file.name).replace(/\..*/, "").humanize())

    // set the options for format
    d3.select("#format")
      .selectAll("option")
      .data(formats)
      .enter()
      .append("option")
      .text(format => format.vendor + " - " + format.origin)

    // function that is called when the selected origin changes
    let onFormatChange = function () {
        // find the selected index
        const index = d3.select("#format").node().selectedIndex
        // find the parent of the format selector
        const parent = d3.select("#format").node().parentNode
        // delete the format note
        d3.select(parent)
          .selectAll(".format-note")
          .remove()
        // if there is a format note, append it
        if (formats[index].note && formats[index].note.length > 0) {
            d3.select(parent)
              .insert("text", "#format + *")
              .attr("class", "format-note")
              .html("<span class='fa-solid fa-info-circle'></span> " + formats[index].note)
        }
    }

    let onSubmitClick = function () {
        uploadFile({
            "file":   file,
            "name":   d3.select("#name").node().value ? d3.select("#name").node().value : d3.select("#name").attr("placeholder"),
            "format": formats[d3.select("#format").node().selectedIndex]
        })
    }

    // change listener to update the note text
    d3.select("#format")
      .on("change", onFormatChange)
    // update the note text once
    onFormatChange()

    // submit button for form
    $("#submit").button().click(onSubmitClick)
}

uploadFile = function (project) {
    // enable the third tab
    $("#forester-projects-new > .tabs").tabs({disabled: [], active: 2})

    // prepare request
    let req = new XMLHttpRequest()
    let uri = window.origin + "/api/projects"

    // add the information from the upload dialog
    let formData = new FormData();
    formData.set("name",   project.name)
    formData.set("format", JSON.stringify(project.format))
    formData.set("file",   project.file)

    req.onreadystatechange = function () {

        console.log(this)

        if (this.readyState == 4 && this.status == 500) {

            d3.select("#upload")
              .select(".info-icon")
              .attr("class", "info-icon fa-solid fa-circle-xmark fa-shake fa-3x")

            let resp = JSON.parse(this.response)
            if (resp) {
                d3.select("#upload")
                  .select(".info")
                  .text(resp.description)
            }
        }

        if (this.readyState == 4 && this.status == 200) {
            d3.select("#upload")
              .select(".info-icon")
              .attr("class", "info-icon fa-solid fa-check-circle fa-shake fa-3x")

            d3.select("#upload")
                  .select(".info")
                  .text("Sucess")

            setTimeout(() => location.reload(), 100)
        }
    }

    // send request
    req.open("POST", uri)
    req.send(formData);
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
        console.log(this)

        if (this.readyState === 4 && this.status === 200) {
            // remove the project tile
            d3.select("#P-" + project.uuid)
              .remove()
        }

        if (this.readyState === 4 && this.status === 400) {
            alert(this.status + " - could not remove project!")
        }
    }
}

$(function () {
    $("#forester-projects-new").dialog({
        width: "500px",
        resizable: false,
        draggable: false,
        autoOpen: false,
        open: function () {
            $(".forester-projects-dashboard").toggleClass("dialog-closed dialog-open")
        },
        beforeClose: function () {
            $(".forester-projects-dashboard").toggleClass("dialog-closed dialog-open")
        }
    })

    $("#forester-projects-new > .tabs").tabs({
        // disabled: [1, 2]
    })

    // clicking the new project tile opens the project creation dialog
    $('.forester-projects-button-new').click(function (event) {
        $("#forester-projects-new").dialog("open")
    })

    // change in the file drop-area trigger preloading of file
    $('.forester-projects-new-droparea').change(() => preloadFile())
})

window.onload = function () {
    fetch(window.origin + "/api/projects")
        .then(response => response.json())
        .then(projects => createProjectDashboard(projects))
}