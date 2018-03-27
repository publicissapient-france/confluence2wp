const simpleParser = require("mailparser").simpleParser
const fs = require('fs')
const path = require('path')
const { JSDOM } = require("jsdom")
require("dotenv").config()
const request = require('request')
const Entities = require('html-entities').XmlEntities
const entities = new Entities()

const OUTPUT_DIR = "blog-post"
const BLOG_ROOT = "http://blog.xebia.fr/wp-content/uploads"
const CONFLUENCE_API_TOKEN = process.env.CONFLUENCE_API_TOKEN
const CONFLUENCE_USER = process.env.CONFLUENCE_USER

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

function downloadTo(url, dest) {
    var file = fs.createWriteStream(dest)
    var sendReq = request.get(url, {
        'auth': {
            'user': CONFLUENCE_USER,
            'pass': CONFLUENCE_API_TOKEN,
            'sendImmediately': true
        }
    })
    
    sendReq.on('error', function (err) {
        fs.unlink(dest)
    })
    
    sendReq.pipe(file)
    
    file.on('finish', function() {
        file.close()
    })
    
    file.on('error', function(err) {
        fs.unlink(dest)
    })
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
                const aliasTag = image.getAttribute("data-linked-resource-default-alias")
                
                if (aliasTag != null) {
                    const alias = aliasTag.replace(/ /g, "-")
                    const remoteSrc = decodeURI(image.getAttribute("data-image-src"))
                    downloadTo(remoteSrc, path.resolve(outputDir, alias))
                    
                    image.src = BLOG_ROOT + "/" + year + "/" + month + "/" + alias
                }
            }
            
            // Create HTML output
            const HTML = entities.decode(dom.window.document.body.innerHTML)
            fs.writeFileSync(path.resolve(outputDir, 'output.txt'), HTML)
            
            return HTML
        })
    }    
}
