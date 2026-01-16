import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import connectDB from './configs/db';
import 'dotenv/config';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import AuthRouter from './routes/AuthRoutes';
import ThumbnailRouter from './routes/ThumbnailRoutes';
import UserRouter from './routes/UserRoutes';


declare module 'express-session' {
    interface SessionData {
        isLoggedIn: boolean,
        userId: string
    }
}

const app = express();

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000','https://thumblify-phi.vercel.app'],
    credentials: true
}));
app.use(session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    proxy: true, // Trust the reverse proxy
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 * 7,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        httpOnly: true
    },
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI as string,
        collectionName: 'sessions'
    })
}))

app.use(express.json());
app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});
app.use('/api/auth', AuthRouter);
app.use('/api/thumbnail', ThumbnailRouter);
app.use('/api/user', UserRouter);
app.use('/my-generations', express.static(path.join(__dirname, 'my-generations')));

// Simple HF model availability check (useful for debugging HF model access)
app.get('/api/hf/check-model', async (req: Request, res: Response) => {
    try {
        const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY;
        const model = process.env.HF_MODEL || 'stabilityai/stable-diffusion-2';
        if (!hfKey) return res.status(400).json({ ok: false, message: 'Missing HF API key (HF_API_KEY or HUGGINGFACE_API_KEY)' });

        const resp = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${hfKey}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({ inputs: 'test', options: { wait_for_model: true } }),
        });

        const text = await resp.text();
        if (!resp.ok) {
            return res.status(resp.status).json({ ok: false, status: resp.status, body: text });
        }
        return res.json({ ok: true, status: resp.status, body: text });
    } catch (err: any) {
        console.error('HF check error:', err);
        return res.status(500).json({ ok: false, message: err?.message || 'Error' });
    }
});
const port = process.env.PORT || 3000;

async function start(): Promise<void> {
    try {
        // Basic env validation (trim values to avoid accidental spaces in .env)
        const required = ['MONGODB_URI', 'SESSION_SECRET'];
        const missing = required.filter((k) => !process.env[k] || !process.env[k]?.toString().trim());
        if (missing.length) {
            console.error('Missing required env vars:', missing.join(', '));
            process.exit(1);
        }

        const clipdropKeyPresent = !!process.env.CLIPDROP_API_KEY;
        if (!clipdropKeyPresent) {
            console.warn('Warning: CLIPDROP_API_KEY is not set. Thumbnail generation will fail.');
        }

        await connectDB();
        app.listen(port, () => {
            console.log(`Server is running at http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();