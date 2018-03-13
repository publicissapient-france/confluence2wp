const simpleParser = require("mailparser").simpleParser;
const fs = require('fs');
const { JSDOM } = require("jsdom");

const OUTPUT_DIR = "blog-post";
const BLOG_ROOT = "http://blog.xebia.fr/wp-content/uploads";

function strPad(n) {
    return String("00" + n).slice(-2);
}

function extractBrush(params) {
    const paramTokens = params.split(";")
    for (let i = 0; i < paramTokens.length; i++) {
        if (paramTokens[i].trim().startsWith("brush") && paramTokens[i].indexOf(":") != -1) {
            const brushTokens = paramTokens[i].split(":");
            return brushTokens[1].trim();
        }
    }
    return "java";
}

module.exports = {
    parse: function(outputRootDir, path) {
        const outputDir = outputRootDir + "/" + OUTPUT_DIR

        return new Promise((resolve, reject) => {
            const contents = fs.readFileSync(path, 'utf8')
            if (!contents.startsWith("Message-ID:")) {
                reject("Invalid document")
                return
            }
    
            // Create images dir
            if (!fs.existsSync(outputDir)){
                fs.mkdirSync(outputDir)
            }

            resolve(contents)
        }).then(contents => {
            return simpleParser(contents)
        }).then( mail => {
            const date = new Date();
            const year = date.getFullYear().toString()
            const month = strPad(date.getMonth() + 1)
            
            // Read DOM
            const dom = new JSDOM(mail.html)
            
            // Code
            const pres = dom.window.document.getElementsByClassName("syntaxhighlighter-pre");
            for (var i = 0; i < pres.length; i++) {
                const params = pres[i].getAttribute("data-syntaxhighlighter-params");
                const brush = extractBrush(params)
                pres[i].outerHTML = "[" + brush + "]" + pres[i].innerHTML + "[/" + brush + "]"
            }
            
            // Process images
            let attachedImages = {};
            mail.attachments.forEach( (attachment) => {
                const contentLocation = attachment.headers.get("content-location")
                const fileName = contentLocation.substr(contentLocation.lastIndexOf('/') + 1)
                attachedImages[fileName] = attachment.content;
            })
            
            const embeddedImages = dom.window.document.getElementsByClassName("confluence-embedded-image");
            for (var i = 0; i < embeddedImages.length; i++) {
                const currentSrc = embeddedImages[i].src;
                const alias = embeddedImages[i].getAttribute("data-linked-resource-default-alias").replace(/ /g, "-");
                fs.writeFile(outputDir + "/" + alias, attachedImages[currentSrc], "binary", error => { 
                    if (error) {
                        //console.error(error);
                    }
                });
                
                embeddedImages[i].src = BLOG_ROOT + "/" + year + "/" + month + "/" + alias
            }
            
            // Create HTML output
            const HTML = dom.window.document.body.innerHTML
            fs.writeFileSync(outputDir + '/output.txt', HTML)

            return HTML
        })
    }    
}
