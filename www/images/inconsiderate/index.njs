const dir = this.rawPath.slice(0, this.rawPath.lastIndexOf("/"));
const files = (await fs.readdir(dir)).filter(filename => {
	const type = mime.getType(filename);
	return type && type.startsWith("image/");
});
const file = files[Math.floor(Math.random() * files.length)];
this.value = await fs.readFile(`${dir}/${file}`);
this.res.set("Cache-Control", "no-cache no-store");
this.res.set("Content-Type", mime.getType(file));
this.done();
