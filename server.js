console.log("< Server >");
const fs = require("fs");
const request = require("request-promise-native");
const crypto = require("crypto");
const childProcess = require("child_process");
const babel = require("babel-core");
const UglifyJS = require("uglify-js");
const CleanCSS = require("clean-css");
const youKnow = require("./data/youknow.js");
const mime = require("mime");
mime.define({
	"text/html": ["njs"]
});
const session = require("express-session");
const app = require("express")();
app.set("trust proxy", true);
app.use(require("cookie-parser")());
app.use(require("body-parser").raw({
	limit: "100mb",
	type: "*/*"
}));
/* TODO
app.use(session({
	name: "session",
	secret: youKnow.session.secret,
	resave: false,
	saveUninitialized: false,
	cookie: {
		secure: true,
		maxAge: 604800000
	},
	store: new require("connect-redis")(session)({
		
	})
}));
*/
app.use(function(req, res) {
	res.set("X-Magic", "real");
	res.set("Access-Control-Expose-Headers", "X-Magic");
	res.set("Access-Control-Allow-Origin", "*");
	const host = req.get("Host");
	if(host) {
		if(host.startsWith("localhost:")) {
			Object.defineProperty(req, "protocol", {
				value: "https",
				enumerable: true
			});
		}
		if(req.protocol === "http") {
			res.redirect(`https://${host + req.url}`);
		} else {
			req.subdomain = req.subdomains.join(".");
			if(req.subdomain === "www") {
				res.redirect(`${req.protocol}://${host.slice(4) + req.url}`);
			} else {
				try {
					req.decodedPath = decodeURIComponent(req.url);
					req.next();
				} catch(err) {
					res.status(400).send("400");
				}
			}
		}
	} else {
		console.log(req.get("User-Agent"));
		res.status(400).send("I am not quite sure how you could get this error, but you apparently can. I am willing to bet that you need a new web browser. That is probably what caused it.");
	}
});
const html = function() {
	let string = arguments[0][0];
	const substitutions = Array.prototype.slice.call(arguments, 1);
	for(let i = 0; i < substitutions.length; i++) {
		string += String(substitutions[i]).replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + arguments[0][i+1];
	}
	return string;
};
const rawPathCache = {};
const getRawPath = function(path) {
	if(rawPathCache[path]) {
		return rawPathCache[path];
	} else {
		let output = path;
		if(!output.startsWith("/")) {
			output = `/${output}`;
		}
		output = `www${output.replace(/[\\\/]+/g, "/").replace(/\/\.{1,2}(?=\/)/g, "")}`;
		if(output.lastIndexOf("/") > output.lastIndexOf(".") && !(fs.existsSync(output) && !fs.statSync(output).isDirectory())) {
			if(!output.endsWith("/")) {
				output += "/";
			}
			output += "index.njs";
		}
		var keys = Object.keys(rawPathCache);
		if(keys.length > 100) {
			delete rawPathCache[keys[0]];
		}
		return rawPathCache[path] = output;
	}
};
const readCache = {};
const loadCache = {};
const load = function(path, context) {
	const rawPath = getRawPath(path);
	if(context) {
		context = {...context};
		delete context.cache;
		delete context.value;
		delete context.exit;
	} else {
		context = {};
	}
	const properties = ["exit", "req", "res", Object.keys(context)];
	context.value = "";
	return new Promise(function(resolve, reject) {
		let cacheIndex = rawPath;
		if(loadCache[cacheIndex] === 2) {
			cacheIndex += "?";
			const queryIndex = context.req.url.indexOf("?");
			if(queryIndex !== -1) {
				cacheIndex += context.req.url.slice(queryIndex+1);
			}
		}
		if(loadCache[cacheIndex]) {
			resolve({
				...context,
				...loadCache[cacheIndex]
			});
		} else {
			context.exit = function() {
				if(context.cache) {
					if(context.cache === 2) {
						loadCache[rawPath] = context.cache;
						cacheIndex = `${rawPath}?`;
						const queryIndex = context.req.url.indexOf("?");
						if(queryIndex !== -1) {
							cacheIndex += context.req.url.slice(queryIndex+1);
						}
					}
					loadCache[cacheIndex] = {};
					Object.keys(context).forEach(function(i) {
						if(!properties.includes(i)) {
							loadCache[cacheIndex][i] = context[i];
						}
					});
				}
				resolve(context);
			};
			try {
				const modified = fs.statSync(rawPath).mtimeMs;
				if(!readCache[rawPath]) {
					readCache[rawPath] = [modified, eval(`(async function() {\n${fs.readFileSync(rawPath)}\n})`)];
				}
				readCache[rawPath][1].call(context);
			} catch(err) {
				reject(err);
			}
		}
	});
};
app.get("*", async function(req, res) {
	res.set("Cache-Control", "max-age=86400");
	if(req.subdomain === "" || req.subdomain === "d" || req.subdomain === "beta") {
		const queryIndex = req.decodedPath.indexOf("?");
		const noQueryIndex = queryIndex === -1;
		const path = getRawPath(noQueryIndex ? req.decodedPath : req.decodedPath.slice(0, queryIndex));
		const type = (path.lastIndexOf("/") > path.lastIndexOf(".")) ? "text/plain" : mime.getType(path);
		let publicPath = path.slice(3);
		if(path.endsWith("/index.njs")) {
			publicPath = publicPath.slice(0, -9);
		}
		let publicPathQuery = publicPath;
		if(!noQueryIndex) {
			publicPathQuery += req.decodedPath.slice(queryIndex);
		}
		if(req.decodedPath !== publicPathQuery) {
			res.redirect(publicPathQuery);
		} else if(fs.existsSync(path)) {
			res.set("Content-Type", type);
			if(path.endsWith(".njs")) {
				res.set("Cache-Control", "no-cache");
				res.set("Content-Type", "text/html");
				const result = await load(publicPath, {
					req,
					res
				});
				if(result.headers) {
					Object.keys(result.headers).forEach(function(i) {
						res.set(i, result.headers[i]);
					});
				}
				if(result.status) {
					res.status(result.status);
				}
				res.send(result.value);
			} else {
				if(type === "application/javascript" || type === "text/css") {
					res.set("SourceMap", `${publicPath.slice(publicPath.lastIndexOf("/")+1)}.map`);
				}
				fs.createReadStream(path).pipe(res);
			}
		} else {
			if(type === "text/html") {
				res.redirect("/?s=20784&p=1");
			} else {
				res.send("404");
			}
		}
	}
});
app.post("*", async function(req, res) {
	if(req.subdomain === "" || req.subdomain === "d" || req.subdomain === "beta") {
		if(req.path === "/github") {
			const signature = req.get("X-Hub-Signature");
			if(signature && signature === `sha1=${crypto.createHmac("sha1", youKnow.gh.secret).update(req.body).digest("hex")}` && req.get("X-GitHub-Event") === "push") {
				const payload = JSON.parse(req.body);
				if(payload.repository.name === "web") {
					const branch = payload.ref.slice(payload.ref.lastIndexOf("/")+1);
					if(branch === "master") {
						const modified = [];
						const removed = [];
						for(let v of payload.commits) {
							for(let w of [...v.added, ...v.modified]) {
								if(!modified.includes(w)) {
									modified.push(w);
									let contents = String(new Buffer(JSON.parse(await request.get({
										url: `https://api.github.com/repos/${payload.repository.full_name}/contents/${w}?ref=${branch}`,
										headers: {
											"User-Agent": "request"
										}
									})).content, "base64"));
									let index = 0;
									while(index = w.indexOf("/", index)+1) {
										nextPath = w.slice(0, index-1);
										if(!fs.existsSync(nextPath)) {
											fs.mkdirSync(nextPath);
										}
									}
									if(w.startsWith("www/")) {
										if(w.endsWith(".njs")) {
											contents = contents.split(/(html`(?:(?:\${(?:`(?:.*|\n)`|"(?:.*|\n)"|'(?:.*|\n)'|.|\n)*?})|.|\n)*?`)/g);
											for(let i = 1; i < contents.length; i += 2) {
												contents[i] = contents[i].replace(/\n/g, "").replace(/\s+/g, " ");
											}
											contents = contents.join("");
										} else {
											const type = mime.getType(w);
											if(type === "application/javascript") {
												const filename = w.slice(w.lastIndexOf("/")+1);
												const compiled = babel.transform(contents, {
													ast: false,
													comments: false,
													compact: true,
													filename,
													minified: true,
													presets: ["env"],
													sourceMaps: true
												});
												const result = UglifyJS.minify(compiled.code, {
													parse: {
														html5_comments: false
													},
													compress: {
														passes: 2,
														unsafe_comps: true,
														unsafe_math: true,
														unsafe_proto: true
													},
													sourceMap: {
														content: JSON.stringify(compiled.map),
														filename
													}
												});
												contents = result.code;
												fs.writeFileSync(`${w}.map`, result.map);
											} else if(type === "text/css") {
												const output = new CleanCSS({
													inline: false,
													sourceMap: true
												}).minify(contents);
												contents = output.styles;
												const sourceMap = JSON.parse(output.sourceMap);
												sourceMap.sources = [w.slice(w.lastIndexOf("/")+1)];
												fs.writeFileSync(`${w}.map`, JSON.stringify(sourceMap));
											}
										}
									}
									fs.writeFileSync(w, contents);
									if(readCache[w]) {
										delete readCache[w];
									}
									if(loadCache[w]) {
										if(loadCache[w] === 2) {
											Object.keys(loadCache).forEach(function(i) {
												if(i.startsWith(`${w}?`)) {
													delete loadCache[i];
												}
											});
										}
										delete loadCache[w];
									}
								}
							}
							for(let w of v.removed) {
								if(!removed.includes(w)) {
									removed.push(w);
									if(fs.existsSync(w)) {
										fs.unlinkSync(w);
										const type = mime.getType(w);
										if(type === "application/javascript" || type === "text/css") {
											fs.unlinkSync(`${w}.map`);
										}
									}
									let index = w.length;
									while((index = w.lastIndexOf("/", index)-1) !== -2) {
										const path = w.slice(0, index+1);
										if(fs.existsSync(path)) {
											try {
												fs.rmdirSync(path);
											} catch(err) {}
										}
									}
								}
							}
						}
						if(modified.includes("package.json")) {
							childProcess.spawnSync("npm", ["update"]);
						}
						if(modified.includes("server.js")) {
							process.exit();
						}
					}
				}
				res.send();
			}
		}
	}
});
require("http").createServer(app).listen(8082); // beta port
/* beta comment
try {
	require("https").createServer({
		key: fs.readFileSync("certs/privkey1.pem"),
		cert: fs.readFileSync("certs/cert1.pem"),
		ca: fs.readFileSync("certs/chain1.pem")
	}, app).listen(8443);
} catch(err) {}
*/
const stdin = process.openStdin();
stdin.on("data", function(input) {
	console.log(eval(String(input)));
});
