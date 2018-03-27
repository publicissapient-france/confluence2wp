const { ipcRenderer, clipboard } = require('electron')

function dropped(filePath) {
    ipcRenderer.send('start-parsing', filePath)
}

let articleText = ""

function setupInitialState() {
    const initialStepsContainer = window.document.getElementById("initial-steps")
    initialStepsContainer.style.display = "flex"

    const finalStepsContainer = window.document.getElementById("final-steps")
    finalStepsContainer.style.display = "none"

    document.getElementById("copy-text-button").addEventListener("click", () => {
        clipboard.writeText(articleText)
        alert("Text was copied") 
    })
}

ipcRenderer.on('parsing-completed', function(event, arg) {
    const initialStepsContainer = window.document.getElementById("initial-steps")
    initialStepsContainer.style.display = "none"

    const finalStepsContainer = window.document.getElementById("final-steps")
    finalStepsContainer.style.display = "flex"
    articleText = arg.rawHTML
})
