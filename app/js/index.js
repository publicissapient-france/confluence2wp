const { ipcRenderer } = require('electron')

function dropped(filePath) {
    ipcRenderer.send('start-parsing', filePath)
}

function setupInitialState() {
    const initialStepsContainer = window.document.getElementById("initial-steps")
    initialStepsContainer.style.display = "flex"

    const finalStepsContainer = window.document.getElementById("final-steps")
    finalStepsContainer.style.display = "none"

    window.document.getElementById("html-output").onclick = (() => {
        setTimeout(() => {
            if (window.getSelection().toString().length > 0) {
                document.execCommand("copy")
                alert("Article body copied")
            }
        }, 100)
    })
}

ipcRenderer.on('parsing-completed', function(event, arg) {
    const initialStepsContainer = window.document.getElementById("initial-steps")
    initialStepsContainer.style.display = "none"

    const finalStepsContainer = window.document.getElementById("final-steps")
    finalStepsContainer.style.display = "flex"

    const htmlOutputContainer = window.document.getElementById("html-output")
    htmlOutputContainer.innerText = arg.rawHTML
})
