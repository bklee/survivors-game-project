import { Request, Response, NextFunction } from 'express';

export function basicAuth(req: Request, res: Response, next: NextFunction) {
    const expected = process.env.ADMIN_AUTH;
    if (!expected) {
        return res.status(503).json({ error: 'admin not configured' });
    }

    const header = req.headers.authorization;
    if (!header || !header.startsWith('Basic ')) {
        res.set('WWW-Authenticate', 'Basic realm="survivors-admin"');
        return res.status(401).json({ error: 'auth required' });
    }

    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    if (decoded !== expected) {
        return res.status(401).json({ error: 'invalid credentials' });
    }
    next();
}
