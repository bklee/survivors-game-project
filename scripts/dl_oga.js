const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://opengameart.org/content/0x72-dungeon-tileset-ii';

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        // Find zip or png link
        const match = data.match(/href="([^"]+0x72_DungeonTilesetII[^"]+)"/);
        if (match && match[1]) {
            const downloadUrl = match[1];
            console.log('Found URL: ' + downloadUrl);

            const dest = path.join(__dirname, '..', 'public/assets/dungeon_v1.zip'); // it might be png or zip
            const file = fs.createWriteStream(dest);
            https.get(downloadUrl, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log('Downloaded to ' + dest);
                });
            });
        } else {
            console.log('No URL found!');
        }
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
