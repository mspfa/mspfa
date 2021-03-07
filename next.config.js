const { sep } = require('path');

module.exports = {
	webpack: config => {
		for (const { oneOf } of config.module.rules) {
			if (Array.isArray(oneOf)) {
				for (const rule of oneOf) {
					if (Array.isArray(rule.use)) {
						for (const entry of rule.use) {
							if (entry.loader.includes(`${sep}css-loader${sep}`)) {
								// Let global styles be used in style modules.
								entry.options.modules.mode = 'local';
								
								// Undo the default hashing of style module class names.
								entry.options.modules.getLocalIdent = (context, localIdentName, localName) => localName;
							}
						}
					}
				}
			}
		}
		
		// Normally, the minifier thinks `import`ed style modules which have nothing `import`ed `from` them are unused, so it omits them from the production build.
		// This is a workaround to prevent that.
		config.module.rules.push({
			test: /\.[jt]sx?$/,
			loader: 'string-replace-loader',
			options: {
				search: /^import '(.+?(\w+)\.module\.(?:s?css|sass))';$/gm,
				replace: "import __styles_$2 from '$1';\n__styles_$2;"
			}
		});
		
		return config;
	},
	poweredByHeader: false
};