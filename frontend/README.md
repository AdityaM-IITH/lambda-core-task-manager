# Todo++

Todo++ is a React-based todo application built with a focus on **correct state management**, **performance-aware UI behavior**, and **robust handling of edge cases**, rather than visual polish.

The purpose of this project is to demonstrate frontend engineering principles that matter in real-world applications, such as predictable data flow, safe state updates, and explicit handling of async UI states.

---

## Features

- Object-based task model with stable unique IDs  
- Add, toggle (complete / incomplete), and delete tasks  
- Persistent state using `localStorage`  
- Lazy initialization to prevent inconsistent initial state  
- Handwritten debounced search (no external libraries)  
- Async simulation with explicit loading and error UI states  
- Clear separation between source of truth and derived data  

---

## Important Engineering Decisions

- **Identity stability over index-based logic**  
  Tasks use UUIDs instead of array indexes to avoid bugs during deletion or reordering.

- **Functional state updates (`prev`)**  
  Ensures correctness under batched and asynchronous React state updates.

- **Derived data, not duplicated state**  
  Filtered task lists are computed during render instead of being stored in state.

- **Debouncing at the input boundary**  
  Prevents unnecessary recomputation during rapid user input.

- **Explicit async lifecycle modeling**  
  UI clearly represents loading, success, and failure states.

---

## Tech Stack

- React  
- JavaScript (ES6+)  
- Vite  

---
## Live Demo
https://todo-plus-plus-rust.vercel.app/

## Running Locally

```bash
npm install
npm run dev
