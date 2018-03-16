const simpleParser = require("mailparser").simpleParser
const fs = require('fs')
const path = require('path')
const { JSDOM } = require("jsdom")

const OUTPUT_DIR = "blog-post"
const BLOG_ROOT = "http://blog.xebia.fr/wp-content/uploads"

function strPad(n) {
    return String("00" + n).slice(-2)
}

function extractBrush(params) {
    const paramTokens = params.split(";")
    for (let i = 0; i < paramTokens.length; i++) {
        if (paramTokens[i].trim().startsWith("brush") && paramTokens[i].indexOf(":") != -1) {
            const brushTokens = paramTokens[i].split(":")
            return brushTokens[1].trim()
        }
    }
    return "java"
}

module.exports = {
    parse: function(outputRootDir, targetPath) {
        const outputDir = outputRootDir + "/" + OUTPUT_DIR

        return new Promise((resolve, reject) => {
            const contents = fs.readFileSync(targetPath, 'utf8')
            if (!contents.startsWith("Message-ID:")) {
                reject("Invalid document")
                return
            }
    
            // Create images dir
            if (!fs.existsSync(outputDir)){
                fs.mkdirSync(outputDir)
            }

            resolve(contents)
        })
        .then(simpleParser)
        .then(mail => {
            let html = mail.html
            fs.writeFileSync(outputDir + '/output.debug.html', mail.html)

            // Clean up
            html = html.replace(/&nbsp; /g, " ")
            html = html.replace(/<pre class="(\w)+"><br><\/pre>/g, " ")

            const date = new Date();
            const year = date.getFullYear().toString()
            const month = strPad(date.getMonth() + 1)
            
            // Read DOM
            const dom = new JSDOM(html)
            
            // Code
            let pre = dom.window.document.getElementsByClassName("syntaxhighlighter-pre")[0]
            while(typeof(pre) !== "undefined") {
                const params = pre.getAttribute("data-syntaxhighlighter-params")
                const brush = extractBrush(params)
                pre.outerHTML = "[" + brush + "]" + pre.innerHTML + "[/" + brush + "]"
                pre = dom.window.document.getElementsByClassName("syntaxhighlighter-pre")[0]
            }

            // Process images
            let attachedImages = {};
            mail.attachments.forEach(attachment => {
                const contentLocation = attachment.headers.get("content-location")
                const fileName = contentLocation.substr(contentLocation.lastIndexOf('/') + 1)
                attachedImages[fileName] = attachment.content;
            })
            
            const embeddedImages = dom.window.document.getElementsByClassName("confluence-embedded-image")
            for (const image of embeddedImages) {
                const currentSrc = image.src
                const alias = image.getAttribute("data-linked-resource-default-alias").replace(/ /g, "-")
                fs.writeFile(path.resolve(outputDir, alias), attachedImages[currentSrc], "binary", error => {
                    if (error) console.error(error)
                })
                
                image.src = BLOG_ROOT + "/" + year + "/" + month + "/" + alias
            }
            
            // Create HTML output
            const HTML = dom.window.document.body.innerHTML
            fs.writeFileSync(path.resolve(outputDir, 'output.txt'), HTML)

            return HTML
        })
    }    
}
