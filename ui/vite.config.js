import path from 'path'

import { defineConfig, transformWithEsbuild } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { yamlPlugin } from 'esbuild-plugin-yaml'
import fs from 'fs-extra'
import raw from 'vite-raw-plugin'
import react from '@vitejs/plugin-react'
import ViteYaml from '@modyfi/vite-plugin-yaml'

/**
 * Helper function to copy a file based on an env variable.
 * Copy occurs upon startup and each time the file is modified for hot reloading.
 * @param {string} envVar The name of the environment variable that contains the custom file.
 * @param {string|(arg: string) => string} getDestFile The destination file or a function that computes it based on the extracted custom file.
 * @param {string} defaultFile Optional file to fall back on if no custom file is extracted from the environment variable.
 */
function customFile(envVar, getDestFile, defaultFile) {
  const fileName = (process.env && process.env[envVar]) || defaultFile
  if (fileName) {
    const destFile =
      typeof getDestFile === 'function' ? getDestFile(fileName) : getDestFile
    fs.copySync(fileName, destFile)
    // In development mode only, copy the original custom file to tmp whenever it is changed for hot reloading.
    if (process.env.NODE_ENV === 'development') {
      /**
	  fs.watch(fileName, { recursive: true }, (eventType) => {
        if (eventType === 'change') {
          fs.copySync(fileName, destFile)
        }
      })
	  */
    }
  }
}

// Empty tmp folder before copying stuff there.
fs.emptyDirSync('./tmp')

// index.html is placed at the root of the repo for Vite to pick up.
customFile('HTML_FILE', './index.html', './lib/index.tpl.html')
// The CSS and YML file are copied with a fixed name, that name is being used for import.
customFile('CUSTOM_CSS', './tmp/custom-styles.css', './example/example.css')
customFile('YAML_CONFIG', './tmp/config.yml', './example/example-config.yml')
// Don't rename the .graphql file because, if used, the original name is referenced in one of the JS files.
// Constraint: the .graphql file must be in the same original folder as config.js (see below).
customFile('PLAN_QUERY_RESOURCE_URI', (file) => {
  const fileParts = file.split(path.sep)
  if (fileParts.length > 0) {
    const fileName = fileParts[fileParts.length - 1]
    return `./tmp/${fileName}`
  }
  return './tmp/'
})
// JS_CONFIG can be a single file or a folder.
// If using a folder, its content (including subfolders) will be copied into ./tmp/.
// Constraint: That folder should contain a config.js file and not contain any of the other custom files above.
// Alternately, if the folder that holds the JS config files also contains the graphql file,
// you can try passing JS_CONFIG as a folder and omit PLAN_QUERY_RESOURCE_URI.
customFile(
  'JS_CONFIG',
  (file) => (file.endsWith('.js') ? './tmp/config.js' : './tmp/'),
  './example/config.js'
)

export default defineConfig({
  build: {
    // Flatten the output for mastarm deploy (mastarm doesn't support uploading subfolders).
    assetsDir: ''
  },
  optimizeDeps: {
    esbuildOptions: {
      // Point JS files to the JSX loader (needed in addition to the JS-JSX conversion plugin below)
      // From https://stackoverflow.com/questions/74620427/how-to-configure-vite-to-allow-jsx-syntax-in-js-files
      loader: {
        '.js': 'jsx'
      },
      plugins: [yamlPlugin()]
    }
  },
  plugins: [
    {
      name: 'inject-main-script-to-html',
      transformIndexHtml: {
        handler: (html) => {
          // Inject the app script tag after the main div tag.
          // This is done so that existing custom HTML files don't need to be touched.
          html = html.replace(
            '<div id="main"></div>',
            '<div id="main"></div><script type="module" src="/lib/main.js"></script>'
          )

          // Strip out all HTML comments, including nested or consecutive ones.
          // (GH co-pilot suggestion)
          let previous
          do {
            previous = html
            html = html.replace(/<!--[\s\S]*?-->/g, '')
          } while (html !== previous)

          return html
        },
        // Make the changes above before index.html is processed by Vite's build process.
        order: 'pre'
      }
    },
    {
      name: 'treat-js-files-as-jsx',
      async transform(code, id) {
        if (!id.match(/(lib|tmp)\/.*\.js$/)) return null

        // Use the exposed transform from Vite, instead of directly transforming with esbuild.
        // This is needed in addition to the esbuild js loader option above.
        // See https://stackoverflow.com/questions/74620427/how-to-configure-vite-to-allow-jsx-syntax-in-js-files
        return transformWithEsbuild(code, id, {
          jsx: 'automatic',
          loader: 'jsx'
        })
      }
    },

    ViteYaml(),
    // Support very old libraries such as blob-stream and its dependencies
    nodePolyfills({
      protocolImports: true
    }),
    raw({
      fileRegex: /\.graphql$/
    }),
    react()
  ],
  server: {
	host: '0.0.0.0',
    port: 9966,
    strictPort: true
  }
})
