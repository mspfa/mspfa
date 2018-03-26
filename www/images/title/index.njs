this.headers = {
	"Cache-Control": "no-cache no-store",
	"Content-Type": "image/png"
};
this.value = await fs.readFile(`www/images/title/${1+Math.floor(Math.random()*6)}.png`);
this.done();
