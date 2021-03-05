const { sep } = require('path');

module.exports = {
	webpack: config => {
		for (const { oneOf } of config.module.rules) {
			if (Array.isArray(oneOf)) {
				for (const rule of oneOf) {
					if (!rule.sideEffects && Array.isArray(rule.use)) {
						for (const entry of rule.use) {
							if (entry.loader.includes(`${sep}css-loader${sep}`)) {
								// The following is to let global styles be used in style modules.
								entry.options.modules.mode = 'local';
								// The following is to undo the default hashing of CSS module class names.
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