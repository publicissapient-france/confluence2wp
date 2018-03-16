const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const url = require('url')
const converter = require('./converter')

let win
function createWindow () {
    win = new BrowserWindow({width: 900, height: 700, resizable: false})
    
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'app/index.html'),
        protocol: 'file:',
        slashes: true
    }))
    
    win.on('closed', () => {
        win = null
    })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (win === null) {
        createWindow()
    }
})

ipcMain.on('start-parsing', function(event, arg) {
    converter.parse(app.getPath("desktop"), arg)
        .then( HTML => {
            win.webContents.send('parsing-completed', { rawHTML: HTML })
            dialog.showMessageBox({
                message: "Converted successfully"
            })
        })
        .catch( error => {
            dialog.showErrorBox("Error", error.message)
        })
})
