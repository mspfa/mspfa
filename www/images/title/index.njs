this.value = await fs.readFile(`www/images/title/${1 + Math.floor(Math.random() * 6)}.png`);
this.res.set("Cache-Control", "no-cache");
this.res.set("Content-Type", "image/png");
this.done();
