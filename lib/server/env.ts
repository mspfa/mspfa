// When imported, this module sets `process.env` variables from the `.env` files.
// This should always be imported before all other imports so other imported modules can use env values.

import dotenv from 'dotenv';

(process.env as any).NODE_ENV = process.argv[2] || 'development';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });
dotenv.config({ path: '.env' });

export {};