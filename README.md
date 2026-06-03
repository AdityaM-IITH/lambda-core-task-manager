# LambdaCore Todo

A high performance task management application built with a React frontend and a Go backend.

## Architecture

* Frontend: React, Vite, Recharts
* Backend: Go, Gin framework, GORM
* Database: PostgreSQL (production), SQLite (local fallback)

## Features

* User Authentication: Secure registration and login using JWT and bcrypt.
* Task Management: Create, read, update, and delete tasks.
* Prioritization: Mark tasks as high or normal priority.
* Deadlines: Assign due dates to tasks.
* Analytics Dashboard: View statistics on completed, pending, late, and overdue tasks.
* Categories: Organize and filter tasks by custom categories.
* Calendar View: Visualize tasks on a monthly calendar grid.
* Dark Mode: Toggle between light and dark themes.

## Setup

### Backend

1. Navigate to the backend directory:
   cd backend
2. Install dependencies:
   go mod tidy
3. Run the server:
   go run main.go

The server will automatically use a local SQLite database named todos.db if no DATABASE_URL is provided in the environment.

### Frontend

1. Navigate to the frontend directory:
   cd frontend
2. Install dependencies:
   npm install
3. Start the development server:
   npm run dev
