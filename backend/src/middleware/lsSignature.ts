import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

type RawReq = Request & { rawBody?: Buffer };

export function lsSignature(req: Request, res: Response, next: NextFunction) {
    const secret = process.env.LS_WEBHOOK_SECRET;
    if (!secret) {
        console.error('[lsSignature] LS_WEBHOOK_SECRET not configured');
        return res.status(503).json({ error: 'webhook secret not configured' });
    }

    const signature = req.headers['x-signature'];
    if (typeof signature !== 'string' || signature.length === 0) {
        return res.status(401).json({ error: 'missing signature' });
    }

    const raw = (req as RawReq).rawBody;
    if (!raw) {
        console.error('[lsSignature] raw body not captured');
        return res.status(500).json({ error: 'raw body missing' });
    }

    const computed = crypto.createHmac('sha256', secret).update(raw).digest('hex');

    // timing-safe 비교 (길이 다르면 false)
    const sigBuf = Buffer.from(signature, 'utf8');
    const computedBuf = Buffer.from(computed, 'utf8');
    if (sigBuf.length !== computedBuf.length || !crypto.timingSafeEqual(sigBuf, computedBuf)) {
        return res.status(401).json({ error: 'invalid signature' });
    }
    next();
}
