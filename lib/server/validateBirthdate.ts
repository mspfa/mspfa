import type { DateNumber } from 'lib/types';
import type { NextApiResponse } from 'next';

const validateBirthdate = (
	res: NextApiResponse,
	birthdate: DateNumber
) => new Promise<void>(resolve => {
	const now = new Date();

	if (birthdate > Date.UTC(
		now.getFullYear() - 13,
		now.getMonth(),
		// Add one day to be generous to varying time zones.
		now.getDate() + 1
	)) {
		// The user is under 13 years old, which breaks the terms of service.
		res.status(400).send({
			message: 'You must be at least 13 years old.'
		});
		return;
	}

	if (birthdate < Date.UTC(
		now.getFullYear() - 200,
		now.getMonth(),
		now.getDate()
	)) {
		// The user is over 200 years old, which, as far as I know, is currently impossible.
		res.status(400).send({
			message: 'You are too old.\n\nYou should be dead.'
		});
		return;
	}

	resolve();
});

export default validateBirthdate;