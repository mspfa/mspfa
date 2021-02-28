const { sep } = require('path');

module.exports = {
	webpack: config => {
		// The following is to undo the default hashing of CSS module class names.
		for (const { oneOf } of config.module.rules) {
			if (Array.isArray(oneOf)) {
				for (const rule of oneOf) {
					if (!rule.sideEffects && Array.isArray(rule.use)) {
						for (const entry of rule.use) {
							if (entry.loader.includes(`${sep}css-loader${sep}`)) {
								entry.options.modules.getLocalIdent = (context, localIdentName, localName) => localName;
							}
						}
					}
				}
			}
		}
		return config;
	},
	poweredByHeader: false
};