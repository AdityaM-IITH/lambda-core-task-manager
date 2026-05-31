# Lambda Core Task Manager 🚀

![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-black?style=for-the-badge&logo=vercel)
![Python](https://img.shields.io/badge/Python-3.11+-blue.svg?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)

**Live URL:** [https://lambda-core-task-manager.vercel.app/](https://lambda-core-task-manager.vercel.app/)

A full-stack, production-ready task management application built as a monolithic repository. Features a blazing-fast Python FastAPI backend and a responsive React frontend.

## ✨ Features

- **JWT Authentication:** Secure user registration, login, and protected routes using stateless JWT tokens.
- **Data Isolation:** Each user has an isolated database view; you can only see and edit your own tasks.
- **Dynamic Task Prioritization:** One-click toggle to separate High Priority tasks from Normal tasks.
- **Debounced Search:** Instant, lag-free search filtering powered by a custom React debounce hook.
- **Vanilla CSS Dark Mode:** Beautiful, lightning-fast dark mode toggling using pure CSS variables (no bloated frameworks).
- **Mobile Responsive UI:** Custom CSS `@media` queries instantly transform horizontal desktop tables into vertical mobile cards.
- **CSV Data Export:** Generate and download a CSV file of all tasks instantly on the client side.

## 🛠️ Tech Stack

**Frontend:**
- React (Vite)
- JavaScript
- Vanilla CSS 
- Vercel (Deployment)

**Backend:**
- Python FastAPI
- SQLAlchemy (ORM)
- SQLite (Database)
- PassLib & Bcrypt (Password Hashing)
- Render.com (Deployment)

## 🚀 Local Development Setup

Clone the repository to your local machine:
```bash
git clone https://github.com/AdityaM-IITH/lambda-core-task-manager.git
cd lambda-core-task-manager
```

### 1. Start the Backend
Open a terminal and navigate to the root directory:
```bash
# Create and activate a virtual environment
python -m venv .venv
source .venv/Scripts/activate  # Windows

# Install dependencies
pip install -r backend/requirements.txt

# Start the FastAPI server
uvicorn backend.main:app --reload
```

### 2. Start the Frontend
Open a second terminal and navigate to the frontend directory:
```bash
cd frontend

# Install Node modules
npm install

# Start the Vite development server
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend Swagger UI will be available at `http://localhost:8000/docs`.
