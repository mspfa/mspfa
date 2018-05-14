console.log("< BikeStuntsBot >");
const fs = require("fs");
const Discord = require("discord.js");
const evalTest = /```js\n((?:.|\n)*?)\n```/;
const doNothing = () => {};
let data;
const load = () => {
	data = JSON.parse(fs.readFileSync("data/bikestunts.json"));
};
load();
const save = () => {
	fs.writeFileSync("data/bikestunts.json", JSON.stringify(data));
};
const client = new Discord.Client();
const exitOnError = err => {
	console.error(err);
	process.exit(1);
};
process.once("unhandledRejection", exitOnError);
client.once("error", exitOnError);
client.once("disconnect", exitOnError);
const respond = channel => {
	channel.send("Have you tried `ctrl`+`F5`?").catch(doNothing);
};
let guild;
client.once("ready", () => {
	guild = client.guilds.get("294616636726444033");
	client.user.setPresence({
		status: "online"
	});
	client.user.setActivity("a song you like");
});
client.on("guildMemberAdd", member => {
	guild.channels.get("394160269980467200").send(`${member} Welcome to ${guild.name}! We don't get it either.`);
});
client.on("guildMemberRemove", member => {
	for(const v of member.roles) {
		if(v.name.startsWith("#")) {
			if(v.members.size > 1) {
				member.roles.remove(v);
			} else {
				v.delete();
			}
			break;
		}
	}
});
client.on("typingStart", channel => {
	if(channel.type === "dm") {
		respond(channel);
	}
});
const prefix = /^> ?/;
client.on("message", async msg => {
	if(msg.author.bot) {
		return;
	}
	const isPublic = msg.channel.type === "text";
	let content = msg.content;
	const lowerCaseContent = content.toLowerCase();
	if(msg.author.id !== "152282430915608578" && (lowerCaseContent.includes("grant") || lowerCaseContent.includes("miro") || lowerCaseContent.includes("cube"))) {
		guild.members.get("152282430915608578").send(`${msg.author} has mentioned you in ${msg.channel}.`);
	}
	if(!isPublic) {
		respond(msg.channel);
	} else {
		if(msg.content.includes("<@294635195439513601>")) {
			respond(msg.channel);
		}
		if(msg.channel.id === "394162947867410434") {
			if(msg.author.id !== data.lastShillAuthor) {
				if(Date.now()-data.lastShillDate < 300000) {
					msg.delete();
					msg.author.send("You must wait at least five minutes after someone posts in <#394162947867410434> before posting there too.");
				} else {
					data.lastShillDate = Date.now();
					data.lastShillAuthor = msg.author.id;
					save();
				}
			}
		} else if(msg.channel.id === "394162913155219456" && (msg.attachments.size || msg.embeds.length || msg.content.includes("://")) && msg.author.id !== data.lastCreativeAuthor) {
			if(Date.now()-data.lastCreativeDate < 300000) {
				msg.delete();
				msg.author.send("You must wait at least five minutes after someone posts a creative work in <#394162913155219456> before posting yours too.");
			} else {
				data.lastCreativeDate = Date.now();
				data.lastCreativeAuthor = msg.author.id;
				save();
			}
		}
		if(prefix.test(content)) {
			const member = msg.guild.member(msg.author) || await msg.guild.members.fetch(msg.author);
			content = content.replace(prefix, "");
			const contentSpaceIndex = content.indexOf(" ");
			const contentLineIndex = content.indexOf("\n");
			const index = Math.min((contentSpaceIndex !== -1) ? contentSpaceIndex : Infinity, (contentLineIndex !== -1) ? contentLineIndex : Infinity);
			if(index !== Infinity) {
				content = [content.slice(0, index), content.slice(index+1)];
			} else {
				content = [content];
			}
			content[0] = content[0].toLowerCase();
			if(content[0] === "help") {
				msg.author.send("**There is no help for you now.**");
			} else if(member.hasPermission(0x00002000)) {
				if(content[0] === "react") {
					if(msg.author.id === "152282430915608578") {
						const emojis = content[1].split(" ");
						msg.channel.messages.fetch({
							limit: 1,
							before: msg.id
						}).then(msgs => {
							const msg2 = msgs.first();
							for(const v of emojis) {
								if(v) {
									msg2.react(v).catch(doNothing);
								}
							}
							msg.delete();
						});
					}
				} else if(content[0] === "delete") {
					msg.delete().then(() => {
						const messages = parseInt(content[1]);
						if(!isNaN(content[1])) {
							msg.channel.bulkDelete(parseInt(content[1])).catch(doNothing);
						}
					});
				} else if(content[0] === "eval") {
					try {
						eval(content[1].replace(evalTest, "$1"));
					} catch(err) {
						console.error(err);
					}
				}
			}
		}
	}
});
client.login(data.token);
fs.watch(__filename, () => {
	process.exit();
});
const stdin = process.openStdin();
stdin.on("data", input => {
	console.log(eval(String(input)));
});
