# 📸 Thumblify – AI YouTube Thumbnail Generator

Thumbify is an intelligent web application that empowers content creators to generate click-worthy YouTube thumbnails using AI. Leveraging ClipDrop’s text-to-image API, Thumbify transforms simple text descriptions into high-quality visual thumbnails with customizable styles, ratios, and overlays.

<img width="1919" height="1039" alt="image" src="https://github.com/user-attachments/assets/116c0913-401e-4a6a-94cc-e3084cf34c17" />


<img width="1901" height="1036" alt="image" src="https://github.com/user-attachments/assets/6cfec019-a862-46f5-9c04-0361ddfc4a37" />


<img width="1901" height="1037" alt="image" src="https://github.com/user-attachments/assets/805b836b-0519-483b-8959-131234f5688c" />


<img width="1898" height="1029" alt="image" src="https://github.com/user-attachments/assets/f045bd83-2207-4c63-a9dd-60bf8c0972fe" />


# 🚀 Key Features
🎨 AI-Powered Thumbnail Generation

Generate stunning thumbnails instantly by describing your idea. Powered by ClipDrop’s advanced text-to-image API.

🛠️ Rich Customization

Choose from multiple:

Aspect ratios

Artistic styles (Cinematic, Anime, Realistic, 3D, etc.)

Color themes

🔡 Text Overlay Integration

Add titles, captions, and hooks directly to thumbnails.

💾 My Generations

All created thumbnails are automatically saved and organized for later access.

📺 YouTube Preview Mode

See your thumbnail in:

YouTube Home Feed preview

YouTube Sidebar preview

Before downloading or publishing.

🔒 Secure User Authentication

Full signup/login system powered by Express sessions.
(Passwords securely hashed, persistent sessions enabled.)

# 🧰 Tech Stack
Frontend

React (Vite)

TailwindCSS

Framer Motion (animations)

Lucide React (icons)

Backend

Node.js

Express.js

TypeScript

Database & Storage

MongoDB + Mongoose

Cloudinary (image hosting)

AI Services

ClipDrop (primary image generation)

# 🔑 Environment Variables
Server – /server/.env
PORT=3000

MONGODB_URI=your_mongodb_connection_string

SESSION_SECRET=your_session_secret_key

AI & Storage
CLIPDROP_API_KEY=your_clipdrop_api_key

CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

Client – /client/.env

(Vite requires all env variables to start with VITE_)

VITE_API_URL=http://localhost:3000

# ⚙️ Installation & Running Locally
1️⃣ Clone the Repository
git clone https://github.com/daniwinsss/Thumblify.git
cd Thumbify

2️⃣ Server Setup
cd server
npm install

create and configure your .env file
npm run dev   # or npm start

3️⃣ Client Setup
cd client
npm install
npm run dev

# 📡 API Endpoints (Overview)
Authentication

Method	Endpoint	Description

POST	/api/auth/register	Register a new user

POST	/api/auth/login	Login user

POST	/api/auth/logout	Logout user

Thumbnails

Method	Endpoint	Description

POST	/api/thumbnail/generate	Generate a new AI thumbnail

DELETE	/api/thumbnail/delete/:id	Delete a saved thumbnail

User

Method	Endpoint	Description

GET	/api/user/profile	Fetch logged-in user profile
