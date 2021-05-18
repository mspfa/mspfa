import type { MessageDocument } from 'modules/server/messages';

export type ClientMessage = Pick<MessageDocument, 'subject' | 'content'> & {
	id: string,
	sent: number,
	edited?: number,
	from: string,
	/**
	 * @minItems 1
	 * @uniqueItems true
	 */
	to: string[],
	replyTo?: string
};