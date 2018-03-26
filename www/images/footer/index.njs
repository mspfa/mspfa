const dir = this.rawPath.slice(0, this.rawPath.lastIndexOf("/"));
const files = (await fs.readdir(dir)).filter(i => {
	const type = mime.getType(i);
	return type && type.startsWith("image/");
});
const file = files[Math.floor(Math.random()*files.length)];
this.value = await fs.readFile(`${dir}/${file}`);
this.headers = {
	"Cache-Control": "no-cache no-store",
	"Content-Type": mime.getType(file)
};
this.done();
