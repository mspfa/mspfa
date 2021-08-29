import validate from './index.validate';
import type { APIHandler } from 'lib/server/api';
import getRandomImageFilename from 'lib/server/getRandomImageFilename';

const Handler: APIHandler<{
	method: 'GET'
}, {
	body: { name: string }
}> = async (req, res) => {
	await validate(req, res);

	res.send({
		name: await getRandomImageFilename('public/images/footers')
	});
};

export default Handler;