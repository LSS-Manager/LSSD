const fs = require('fs/promises');
const path = require('path');
const jsdom = require('jsdom');

const PATH = path.resolve(__dirname);

const defaultGame = 'https://missionchief.co.uk';
const GAME = process.env.GAME || defaultGame;

const suffix = GAME === defaultGame ? '' : '.alt';

let timestamp = 0;

fetch(GAME)
    .then(res => res.text())
    .then(html => new jsdom.JSDOM(html))
    .then(dom => dom.window.document)
    .then(doc => ({
        js: doc.querySelector('script[src^="/assets/application-"][src$=".js"]')
            ?.src,
        css: doc.querySelector(
            'link[href^="/assets/application-"][href$=".css"]'
        )?.href,
    }))
    .then(files => {
        timestamp = new Date().toISOString();
        return files;
    })
    .then(async ({ js, css }) => ({
        js: await fetch(`${GAME}${js}`).then(res => res.text()),
        css: await fetch(`${GAME}${css}`).then(res => res.text()),
        jsPath: js,
        cssPath: css,
    }))
    .then(({ js, css, jsPath, cssPath }) =>
        Promise.all([
            fs
                .writeFile(path.resolve(PATH, `application${suffix}.js`), js)
                .then(() => jsPath),
            fs
                .writeFile(path.resolve(PATH, `application${suffix}.css`), css)
                .then(() => cssPath),
        ])
    )
    .then(([jsPath, cssPath]) =>
        fs
            .readFile(path.resolve(PATH, 'README.md'))
            .then(readme => [readme, jsPath, cssPath])
    )
    .then(([readme, jsPath, cssPath]) =>
        fs.writeFile(
            path.resolve(PATH, 'README.md'),
            readme.toString().replace(
                /<!--\s*automated\s-->(.|\n)*?<!--\s*\/automated\s*-->/,
                `
<!-- automated -->
## JS
| Attribute | Value |
| --------- | ----- |
| File      | [${jsPath.replace(/^\/assets\//, '')}](${GAME}${jsPath}) |
| Server    | ${GAME} |
| Time      | ${timestamp} |

## CSS
| Attribute | Value |
| --------- | ----- |
| File      | [${cssPath.replace(/^\/assets\//, '')}](${GAME}${cssPath}) |
| Server    | ${GAME} |
| Time      | ${timestamp} |

## Pretty-print
Tool: [prettier](https://prettier.io)
Options: [.prettierrc.json](./.prettierrc.json)

<!-- /automated -->
`.trim()
            )
        )
    );
