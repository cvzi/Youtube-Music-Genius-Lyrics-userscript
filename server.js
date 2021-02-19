import { red, green, cyan, bold } from 'colorette'
const path = require('path')
const fs = require('fs')
const http = require('http')
const handler = require('serve-handler')
const pkg = require('./package.json')

console.log('👀 watch & serve 🤲\n###################\n')

const port = pkg.config.port
const destDir = 'dist/'
const devScriptInFile = 'dev.user.js'
const outFile = path.join(destDir, 'out.js')
const hyperlink = (url, title) => `\u001B]8;;${url}\u0007${title || url}\u001B]8;;\u0007`

fs.mkdir('dist/', { recursive: true }, () => null)

// Start web server
const server = http.createServer((request, response) => {
  return handler(request, response, {
    public: destDir
  })
})
server.listen(port, () => {
  console.log(`Running webserver at ${hyperlink(`http://localhost:${port}`)}`)
})

// Create the userscript for development 'dist/dev.user.js'
const devScriptOutFile = path.join(destDir, devScriptInFile)
console.log(cyan(`generate development userscript ${bold(devScriptInFile)} → ${bold(devScriptOutFile)}...`))

// Read dev script
const devScriptContent = fs.readFileSync(devScriptInFile, 'utf8').replace(/%PORT%/gm, port.toString())

// Read require configuration
const requires = require('./requires.json')

// Read userscript
let userScriptFile = null
for (const file of fs.readdirSync('.')) {
  if (file.endsWith('.user.js') && !file.endsWith('dev.user.js')) {
    userScriptFile = file
    break
  }
}
const userScriptContent = fs.readFileSync(userScriptFile, 'utf8')

// Copy header from userscript to devscript
let header = userScriptContent.split('// ==/UserScript==', 1)[0]

const grants = []
if (header.indexOf('GM.xmlHttpRequest') === -1) {
  grants.push('GM.xmlHttpRequest')
}
if (header.indexOf('GM.setValue') === -1) {
  grants.push('GM.setValue')
}
if (header.indexOf('GM.getValue') === -1) {
  grants.push('GM.getValue')
}

if (grants) {
  grants.forEach(function (fname) {
    header += `\n// @grant        ${fname}\n`
  })
}

// Remove @require
if (header.indexOf('@require') !== -1) {
  for (const match of header.matchAll(/@require\s+(.+)/gm)) {
    const requireUrl = match[1]
    if (requireUrl in requires) {
      console.log(red(`Using local @require ${requireUrl} in ${requires[requireUrl]}`))
      header = header.replace(new RegExp('//\\s*@require\\s+' + requireUrl.replace('.', '\\.'), ''), '')
    }
  }
}

header += '\n// @connect localhost'

// Write devscript to file
const outContent = `${header}\n// ==/UserScript==\n\n${devScriptContent}`

fs.writeFileSync(devScriptOutFile, outContent)
console.log(green(`created ${bold(devScriptOutFile)}. Please install in Tampermonkey: `) + hyperlink(`http://localhost:${port}/${devScriptInFile}`))

// Create out.js
const fileWatchers = {}
function updateOut (event, filename) {
  if (filename) {
    const stats = fs.statSync(fileWatchers[filename][0])
    if (stats.size === 0 || stats.mtime.valueOf() === fileWatchers[filename][1].valueOf()) {
      return
    }
    fileWatchers[filename][1] = stats.mtime

    const userScriptContent = fs.readFileSync(userScriptFile, 'utf8')

    const parts = userScriptContent.split('// ==/UserScript==')
    const header = parts.shift()
    const script = parts.join('// ==/UserScript==')

    // Insert @require code from requires.json
    let requiresContent = []
    if (header.indexOf('@require') !== -1) {
      for (const match of header.matchAll(/@require\s+(.+)/gm)) {
        const requireUrl = match[1]
        if (requireUrl in requires) {
          const content = fs.readFileSync(requires[requireUrl], 'utf8')
          requiresContent.push(content.split('// ==/UserScript==').pop())
        }
      }
    }
    requiresContent = requiresContent.join('\n\n')

    const outContent = `${header}\n// ==/UserScript==\n\n${requiresContent}\n${script}`

    fs.writeFileSync(outFile, outContent)
    console.log(`${fileWatchers[filename][0]} file changed -> Updated ${outFile}`)
  }
}

// Watch for file changes
fileWatchers[path.basename(userScriptFile)] = [userScriptFile, new Date(0)]
fs.watch(userScriptFile, updateOut)
for (const url in requires) {
  fileWatchers[path.basename(requires[url])] = [requires[url], new Date(0)]
  fs.watch(requires[url], updateOut)
}
updateOut(null, path.basename(userScriptFile))
