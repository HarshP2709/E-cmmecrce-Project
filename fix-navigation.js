const fs = require('fs');
const path = require('path');

function replacePath(dir) {
    fs.readdirSync(dir).forEach(f => {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) {
            replacePath(p);
        } else if (p.endsWith('.js')) {
            let c = fs.readFileSync(p, 'utf8');
            let original = c;

            // Fix HTML links `<a href="/pages/...`
            c = c.replace(/href="\/pages\/([^"]+)"/g, (match, pathStr) => {
                return 'href="${window.location.pathname.includes(\'/pages/\') ? \'\' : \'pages/\'}' + pathStr + '"';
            });

            // Fix JS absolute redirects `window.location.href = '/pages/...` (single quotes)
            c = c.replace(/window\.location\.href\s*=\s*'\/pages\/([^']+)'/g, (match, pathStr) => {
                return "window.location.href = (window.location.pathname.includes('/pages/') ? '' : 'pages/') + '" + pathStr + "'";
            });

            // Fix JS absolute redirects with backticks `window.location.href = `/pages/...`
            c = c.replace(/window\.location\.href\s*=\s*`\/pages\/([^`]+)`/g, (match, pathStr) => {
                return "window.location.href = (window.location.pathname.includes('/pages/') ? '' : 'pages/') + `" + pathStr + "`";
            });

            // Fix onclick absolute redirects `onclick="...href='/pages/...`
            c = c.replace(/onclick="([^"]*)window\.location\.href='\/pages\/([^']+)'([^"]*)"/g, (match, pre, pathStr, post) => {
                return 'onclick="' + pre + "window.location.href=(window.location.pathname.includes('/pages/') ? '' : 'pages/') + '" + pathStr + "'" + post + '"';
            });

            if (c !== original) {
                fs.writeFileSync(p, c);
                console.log('Fixed', p);
            }
        }
    });
}
replacePath('frontend');
