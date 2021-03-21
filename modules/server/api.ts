import type { NextApiRequest, NextApiResponse } from 'next';

type UnknownObject = Record<string, unknown> | unknown[];

export type APIRequest = Omit<NextApiRequest, 'body'> & { body: unknown };

export type APIResponse<ResponseBody extends UnknownObject = UnknownObject> = Omit<NextApiResponse<ResponseBody>, 'body'>;

export type APIHandler<ResponseBody extends UnknownObject = UnknownObject> = (req: APIRequest, res: APIResponse<ResponseBody>) => void | Promise<void>;