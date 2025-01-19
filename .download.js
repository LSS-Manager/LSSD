const fs = require('fs/promises');
const path = require('path');
const jsdom = require('jsdom');
const { js: beautifyJs, css: beautifyCss } = require('js-beautify');

const BEAUTIFIER_OPTIONS = {
    indent_size: '4',
    indent_char: ' ',
    max_preserve_newlines: '1',
    preserve_newlines: true,
    keep_array_indentation: true,
    break_chained_methods: true,
    indent_scripts: 'normal',
    brace_style: 'collapse',
    space_before_conditional: true,
    unescape_strings: false,
    jslint_happy: true,
    end_with_newline: false,
    wrap_line_length: '110',
    indent_inner_html: true,
    comma_first: false,
    e4x: false,
    indent_empty_lines: false,
};

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
        js: await fetch(`${GAME}${js}`)
            .then(res => res.text())
            .then(js => beautifyJs(js, BEAUTIFIER_OPTIONS)),
        css: await fetch(`${GAME}${css}`)
            .then(res => res.text())
            .then(css => beautifyCss(css, BEAUTIFIER_OPTIONS)),
        jsPath: js,
        cssPath: css,
    }))
    .then(({ js, css, jsPath, cssPath }) => Promise.all([
        fs
            .writeFile(path.resolve(PATH, 'application.js' + suffix), js)
            .then(() => jsPath),
        fs
            .writeFile(path.resolve(PATH, 'application.css' + suffix), css)
            .then(() => cssPath),
    ]))
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
## Beautify options
Tool: [js-beautify](https://github.com/beautify-web/js-beautify)
\`\`\`json
${JSON.stringify(BEAUTIFIER_OPTIONS, null, 4)}
\`\`\`

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
<!-- /automated -->
`.trim()
            )
        )
    );
