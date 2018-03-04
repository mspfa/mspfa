this.headers = {
	"Cache-Control": "no-cache no-store"
};
let dir = fs.readdirSync("www/images/footer");
dir = dir.filter(i => {
	const type = mime.getType(i);
	return type && type.startsWith("image/");
});
const file = dir[Math.floor(Math.random()*dir.length)];
this.headers["Content-Type"] = mime.getType(file);
this.value = fs.readFileSync(`www/images/footer/${file}`);
this.exit();
