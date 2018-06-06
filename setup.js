console.log("< Setup >");
const fs = require("fs");
const {MongoClient} = require("mongodb");
const youKnow = require("./secret/youknow.js");
(async () => {
	require("replthis")(v => eval(v));
	const client = await MongoClient.connect(youKnow.db, {
		compression: "snappy"
	});
	const db = client.db("mspfa");
	const users = await db.createCollection("users", {
		validator: {
			$jsonSchema: {
				bsonType: "object",
				additionalProperties: false,
				required: ["login", "created", "updated", "perm", "name", "email", "verified", "publicEmail", "icon", "random", "website", "game", "achievement", "notify", "keys", "publicFavs"],
				properties: {
					_id: {
						bsonType: "objectId"
					},
					login: {
						bsonType: "object",
						additionalProperties: false,
						properties: {
							google: {
								bsonType: "string",
								minLength: 1
							}
						}
					},
					created: {
						bsonType: "date"
					},
					updated: {
						bsonType: "date"
					},
					perm: {
						bsonType: "int",
						minimum: 0
					},
					name: {
						bsonType: "string",
						minLength: 1,
						maxLength: 32
					},
					email: {
						bsonType: "string",
						minLength: 3,
						maxLength: 254
					},
					verified: {
						bsonType: "bool"
					},
					publicEmail: {
						bsonType: "bool"
					},
					icon: {
						bsonType: "string",
						maxLength: 2048
					},
					random: {
						bsonType: "string",
						maxLength: 2048
					},
					website: {
						bsonType: "string",
						maxLength: 2048
					},
					game: {
						bsonType: "object",
						additionalProperties: false,
						patternProperties: {
							"^\d+$": {
								bsonType: "int",
								minimum: 1
							}
						}
					},
					achievement: {
						bsonType: "array",
						uniqueItems: true,
						additionalItems: false,
						items: {
							enum: ["adventure", "favs10", "favs100", "favs413", "favs1000", "featured", "js", "contribute", "good", "patron", "magic"]
						}
					},
					notify: {
						bsonType: "object",
						additionalProperties: false,
						required: ["message", "update", "comment", "tag"],
						patternProperties: {
							".+": {
								bsonType: "int",
								minimum: 0
							}
						}
					},
					keys: {
						bsonType: "object",
						additionalProperties: false,
						required: ["spoilers", "previous", "next"],
						patternProperties: {
							".+": {
								bsonType: "int",
								minimum: 0,
								maximum: 65535
							}
						}
					},
					publicFavs: {
						bsonType: "bool"
					}
				}
			}
		}
	});
	users.insert({
		login: {
			google: "fakeid"
		},
		created: new Date(),
		updated: new Date(),
		perm: 0,
		name: "fakename",
		email: "fakeemail@gmail.com",
		verified: false,
		publicEmail: false,
		icon: "",
		random: "",
		website: "",
		game: {},
		achievement: [],
		notify: {
			message: 2,
			update: 2,
			comment: 2,
			tag: 2
		},
		keys: {
			spoilers: 32,
			previous: 37,
			next: 39
		},
		publicFavs: true
	});
})();
fs.watch(__filename, () => {
	process.exit();
});
