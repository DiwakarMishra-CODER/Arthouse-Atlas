# Arthouse Atlas 🎥

> A curated digital archive for the modern cinephile. Explore the world of arthouse cinema through Directors, Movements, and Studios.

![Arthouse Atlas Homepage](./assets/homepage_v2.png)
*(The Arthouse Atlas Experience)*

## 🌟 Introduction
**Arthouse Atlas** is a MERN stack application designed to move beyond the algorithmic noise of mainstream streaming. It focuses on **human curation**, allowing users to navigate cinema history through interconnected constellations of Directors, Art Movements, and Production Studios.

## 🚀 Key Features
* **The Starfield UI:** An immersive, animated background representing the vastness of cinema.
* **Three-Pillar Navigation:**
    * **Directors:** Deep dives into the filmographies of auteurs like Tarkovsky and Lynch.
    * **Movements:** Explore the French New Wave, German Expressionism, and more.
    * **Studios:** A curated look at institutions like A24, Janus Films, and Criterion.
* **Authentication:**
    * Secure Email/Password Login (JWT).
    * **Continue with Google** (OAuth 2.0).
* **User Libraries:**
    * Personalized **Favorites**, **Watchlist**, and **Watched** logs.
* **Responsive Design:** Fully optimized for obscure desktop monitors and mobile devices alike.

## 🛠️ Tech Stack
* **Frontend:** React (Vite), Tailwind CSS, Framer Motion.
* **Backend:** Node.js, Express.js.
* **Database:** MongoDB (Atlas).
* **Authentication:** JWT, Google OAuth Library.

## ⚙️ Installation & Setup

**1. Clone the Repository**
```bash
git clone https://github.com/YOUR_USERNAME/arthouse-atlas.git
cd arthouse-atlas
```

**2. Install Dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

**3. Environment Variables**
Create a `.env` file in **backend/**:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
```

Create a `.env` file in **frontend/**:
```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

**4. Run the App**
```bash
# Run both servers (from root if configured, otherwise separate terminals)
npm run dev
```

## 🤝 Contributing
Contributions are welcome. Please open an issue to discuss proposed changes or submit a Pull Request.

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
