import fs from 'fs-extra';
import { exec } from 'child_process';

const run = (command: string) => new Promise(resolve => {
	const childProcess = exec(command);
	childProcess.stdout?.pipe(process.stdout);
	childProcess.stderr?.pipe(process.stderr);
	childProcess.once('exit', resolve);
});
fs.watch('styles', { recursive: true }, async (evt, filename) => {
	const path = `styles/${filename}`;
	if (path.endsWith('.module.scss')) {
		const declarationPath = `${path}.d.ts`;
		const declarationExists = fs.existsSync(declarationPath);
		if (fs.existsSync(path)) {
			if (!declarationExists) {
				await fs.createFile(declarationPath);
			}
			await fs.writeFile(declarationPath, 'export default {};');
			await run(`npx tsm ${path}`);
			await run(`npx eslint --fix ${declarationPath}`);
		} else if (declarationExists) {
			await fs.unlink(declarationPath);
		}
	}
});