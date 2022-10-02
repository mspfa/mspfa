import validate from './index.validate';
import type { APIHandler, ErrorResponseBody } from 'lib/server/api';
import getRateLimitMessage from 'lib/client/getRateLimitMessage';

const Handler: APIHandler<{
	method: 'GET',
	query: {
		retryAfter: number | string
	}
}, {
	body: ErrorResponseBody & { retryAfter: number }
}> = async (req, res) => {
	await validate(req, res);

	const retryAfter = +req.query.retryAfter;

	res.status(429).send({
		retryAfter,
		message: getRateLimitMessage(retryAfter)
	});
};

export default Handler;
