import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API_URL = "https://lambda-core-task-manager.onrender.com";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [descValue, setDescValue] = useState("");
  const [deadlineValue, setDeadlineValue] = useState("");
  const [categoryValue, setCategoryValue] = useState("General");
  const [isHighPriority, setIsHighPriority] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [dueBeforeFilter, setDueBeforeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editFormData, setEditFormData] = useState({ todo_name: "", todo_desc: "", deadline: "", category: "General", priority: 3 });
  const [hideCompleted, setHideCompleted] = useState(false);
  const [hpSortDir, setHpSortDir] = useState('none'); 
  const [normalSortDir, setNormalSortDir] = useState('none');
  const [activeView, setActiveView] = useState("Dashboard");
  const [currentDate, setCurrentDate] = useState(new Date());

  
  //auth states
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginView, setIsLoginView] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [calendarTaskPopup, setCalendarTaskPopup] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const renderLoadingOverlay = (message = "Processing...") => (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      color: '#fff', backdropFilter: 'blur(3px)'
    }}>
      <div style={{
        width: '50px', height: '50px', border: '5px solid rgba(255,255,255,0.2)',
        borderRadius: '50%', borderTopColor: '#fff', animation: 'spin 1s ease-in-out infinite',
        marginBottom: '15px'
      }} />
      <h2 style={{ margin: 0, letterSpacing: '1px' }}>{message}</h2>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  //dm state
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  //dbnce search qry
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  //fetch tasks on load
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_URL}/todos`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then(res => {
        if (res.status === 401) {
           handleLogout();
           throw new Error("Session expired, please login again");
        }
        return res.json();
      })
      .then(data => {
        setTasks(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  //auth logic
  const handleAuth = async (e) => {
    e.preventDefault();
    if (isAuthLoading) return;
    setError(null);
    setSuccessMsg(null);
    setIsAuthLoading(true);
    try {
      if (isLoginView) {
        //login uses form data
        const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("password", password);

        const res = await fetch(`${API_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            if (errorData.detail === "User not found") {
                setIsLoginView(false);
                setError("You seem new here, please register");
                return;
            }
            throw new Error("Incorrect password!");
        }
        const data = await res.json();
        localStorage.setItem("token", data.access_token);
        setToken(data.access_token);
        setUsername("");
        setPassword("");
      } else {
        //register uses json
        const res = await fetch(`${API_URL}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });
        if (!res.ok) throw new Error("Username already taken. Please try another.");
        setIsLoginView(true);
        setError(null);
        setSuccessMsg("Registered! You can login now.");
        setPassword("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setTasks([]);
    localStorage.removeItem("token");
    setIsLoginView(true);
    setActiveView("Dashboard");
    setShowSettingsModal(false);
    setInputValue("");
    setDescValue("");
    setDeadlineValue("");
    setCategoryValue("General");
    setIsHighPriority(false);
  };

  //add task
  function addTask(e) {
    e.preventDefault();
    const trimmedName = inputValue.trim();
    const trimmedDesc = descValue.trim();
    
    if (trimmedName.length < 3) {
        setError("Error: Task name must be at least 3 letters long");
        return;
    }

    if (deadlineValue) {
        const todayStr = new Date().toISOString().split("T")[0];
        if (deadlineValue < todayStr) {
            setError("Error: Deadline cannot be in the past.");
            return;
        }
    }
    
    setError(null);
    
    const newTask = {
      todo_name: trimmedName,
      todo_desc: trimmedDesc || "No description",
      priority: isHighPriority ? 1 : 3, 
      is_completed: false,
      deadline: deadlineValue || null,
      category: categoryValue || "General"
    };

    // Optimistic UI Update
    const tempId = Date.now();
    const optimisticTask = { ...newTask, todo_id: tempId };
    setTasks(prev => [...prev, optimisticTask]);
    
    setInputValue("");
    setDescValue("");
    setDeadlineValue("");
    setCategoryValue("General");
    setIsHighPriority(false);

    fetch(`${API_URL}/todos`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(newTask)
    })
    .then(async (res) => {
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            let errMsg = err.detail || "Failed to add task";
            if (typeof errMsg !== "string") {
                errMsg = JSON.stringify(errMsg);
            }
            throw new Error(`Server Error: ${errMsg}`);
        }
        return res.json();
    })
    .then(savedTask => {
      // Swap temp ID with real ID
      setTasks(prev => prev.map(t => t.todo_id === tempId ? savedTask : t));
    })
    .catch(err => {
      setError(err.message);
      // Revert optimistic add
      setTasks(prev => prev.filter(t => t.todo_id !== tempId));
    });
  }

  //toggle
  function toggleTask(task) {
    // Optimistic update
    setTasks(prev => prev.map(t => t.todo_id === task.todo_id ? { ...t, is_completed: !t.is_completed } : t));

    const updatedTask = {
      is_completed: !task.is_completed
    };

    fetch(`${API_URL}/todos/${task.todo_id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(updatedTask)
    })
    .then(res => {
      if (!res.ok) throw new Error("Failed to toggle task");
      return res.json();
    })
    .catch(err => {
      setError(err.message);
      // Revert optimistic toggle
      setTasks(prev => prev.map(t => t.todo_id === task.todo_id ? { ...t, is_completed: task.is_completed } : t));
    });
  }

  //edit start
  const startEdit = (task) => {
    setEditingTaskId(task.todo_id);
    setEditFormData({
      todo_name: task.todo_name,
      todo_desc: task.todo_desc || "",
      deadline: task.deadline || "",
      category: task.category || "General",
      priority: task.priority || 3
    });
  };

  //edit save
  const saveEdit = (task) => {
    const updatedTask = {
      todo_name: editFormData.todo_name.trim(),
      todo_desc: editFormData.todo_desc.trim(),
      deadline: editFormData.deadline || null,
      category: editFormData.category.trim() || "General",
      priority: editFormData.priority
    };

    // Optimistic update
    const previousTaskState = { ...task };
    setTasks(prev => prev.map(t => t.todo_id === task.todo_id ? { ...t, ...updatedTask } : t));
    setEditingTaskId(null);

    fetch(`${API_URL}/todos/${task.todo_id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(updatedTask)
    })
    .then(res => {
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    })
    .catch(err => {
      setError(err.message);
      // Revert optimistic edit
      setTasks(prev => prev.map(t => t.todo_id === task.todo_id ? previousTaskState : t));
    });
  };

  //delete
  function deleteTask(id) {
    // Find task before deleting to enable revert
    const taskToDelete = tasks.find(t => t.todo_id === id);
    
    // Optimistic delete
    setTasks(prev => prev.filter(t => t.todo_id !== id));

    fetch(`${API_URL}/todos/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error("Failed to delete task");
    })
    .catch(err => {
      setError(err.message);
      // Revert optimistic delete
      if (taskToDelete) {
        setTasks(prev => [...prev, taskToDelete]);
      }
    });
  }

  //render auth screen
  if (!token) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-color)', fontFamily: 'sans-serif', padding: '20px', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '40px', backgroundColor: 'var(--secondary-bg)', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 20px 0', color: 'var(--text-color)', fontSize: '32px' }}>LambdaCore</h1>
          <h2 style={{ margin: '0 0 25px 0', color: 'var(--desc-text)', fontSize: '16px', fontWeight: 'normal' }}>{isLoginView ? "Log in to your account" : "Create an account"}</h2>
          
          {successMsg && <div style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)', color: 'var(--green-text)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid rgba(74, 222, 128, 0.2)' }}>{successMsg}</div>}
          {error && <div style={{ backgroundColor: 'rgba(255, 107, 107, 0.1)', color: 'var(--red-text)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid rgba(255, 107, 107, 0.2)' }}>{error}</div>}
          
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="text" 
              placeholder="Username"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              style={{ padding: '14px 15px', width: '100%', boxSizing: 'border-box', fontSize: '15px', borderRadius: '8px' }}
            />
            <input 
              type="password" 
              placeholder="Password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              style={{ padding: '14px 15px', width: '100%', boxSizing: 'border-box', fontSize: '15px', borderRadius: '8px' }}
            />
            <button type="submit" disabled={isAuthLoading} style={{ padding: '14px', width: '100%', backgroundColor: isAuthLoading ? 'var(--btn-gray)' : 'var(--link-color)', color: 'white', border: 'none', borderRadius: '8px', cursor: isAuthLoading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold', marginTop: '10px' }}>
              {isAuthLoading ? "Authenticating..." : (isLoginView ? "Sign In" : "Sign Up")}
            </button>
          </form>
          
          <button onClick={() => { setIsLoginView(!isLoginView); setError(null); setSuccessMsg(null); }} style={{ marginTop: '25px', background: 'none', border: 'none', color: 'var(--desc-text)', cursor: 'pointer', fontSize: '14px' }}>
            {isLoginView ? "Don't have an account? " : "Already have an account? "}
            <span style={{ color: 'var(--link-color)', textDecoration: 'underline' }}>
              {isLoginView ? "Sign up" : "Log in"}
            </span>
          </button>
        </div>
        {isAuthLoading && renderLoadingOverlay("Connecting to server...")}
      </div>
    );
  }

  //render logic
  const getDaysLeft = (deadlineStr) => {
    if (!deadlineStr) return null;
    const now = new Date();
    const dl = new Date(deadlineStr);
    //add tz offset to prevent day-before errors
    dl.setMinutes(dl.getMinutes() + dl.getTimezoneOffset());
    //set deadline to 23:59:59
    dl.setHours(23, 59, 59, 999);
    const diffTime = dl - now;
    return diffTime / (1000 * 60 * 60 * 24);
  };

  let displayedTasks = [...tasks];
  
  if (hideCompleted) {
    displayedTasks = displayedTasks.filter(t => !t.is_completed);
  }

  if (debouncedSearchQuery.trim()) {
    const q = debouncedSearchQuery.toLowerCase();
    displayedTasks = displayedTasks.filter(t => 
      t.todo_name.toLowerCase().includes(q) || 
      (t.todo_desc && t.todo_desc.toLowerCase().includes(q))
    );
  }

  if (categoryFilter !== "All") {
    displayedTasks = displayedTasks.filter(t => (t.category || "General") === categoryFilter);
  }

  if (dueBeforeFilter) {
    displayedTasks = displayedTasks.filter(t => {
      if (!t.deadline) return false;
      return t.deadline <= dueBeforeFilter;
    });
  }

  let highPriorityTasks = displayedTasks.filter(t => t.priority === 1);
  let normalTasks = displayedTasks.filter(t => t.priority !== 1);
  const upcomingTasks = [...displayedTasks].filter(t => t.deadline && !t.is_completed).sort((a,b) => (getDaysLeft(a.deadline) ?? Infinity) - (getDaysLeft(b.deadline) ?? Infinity)).slice(0, 3);

  const sortListByDeadline = (list, dir) => {
    if (dir === 'none') return;
    list.sort((a, b) => {
      const daysA = getDaysLeft(a.deadline) ?? Infinity;
      const daysB = getDaysLeft(b.deadline) ?? Infinity;
      if (dir === 'asc') return daysA - daysB;
      if (dir === 'desc') {
        const validA = daysA === Infinity ? -Infinity : daysA;
        const validB = daysB === Infinity ? -Infinity : daysB;
        return validB - validA;
      }
      return 0;
    });
  };

  sortListByDeadline(highPriorityTasks, hpSortDir);
  sortListByDeadline(normalTasks, normalSortDir);
  sortListByDeadline(displayedTasks, normalSortDir);

  const cycleSort = (currentDir, setDir) => {
    if (currentDir === 'none' || currentDir === 'desc') setDir('asc');
    else setDir('desc');
  };

  const getSortIcon = (dir) => {
    if (dir === 'asc') return '▴';
    if (dir === 'desc') return '▾';
    return '';
  };

  const downloadCSV = () => {
    if (displayedTasks.length === 0) return;
    const headers = ["Task Name", "Description", "Priority", "Deadline", "Status"];
    const rows = displayedTasks.map(t => [
      `"${t.todo_name.replace(/"/g, '""')}"`,
      `"${(t.todo_desc || "").replace(/"/g, '""')}"`,
      t.priority === 1 ? "High" : "Normal",
      t.deadline || "None",
      t.is_completed ? "Completed" : "Pending"
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "todos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderTask = (task) => {
    const daysLeft = getDaysLeft(task.deadline);
    let dateColor = 'var(--text-color)';
    let dateText = task.deadline || "-";
    let subText = "";
    
    if (daysLeft !== null && !task.is_completed) {
        if (daysLeft < 0) {
            dateColor = 'var(--red-text)'; //dark red
            subText = "Expired";
        } else if (daysLeft < 1) {
            dateColor = 'var(--red-text)'; //red
            const hrsLeft = Math.floor(daysLeft * 24);
            subText = `${hrsLeft} hours left`;
        } else if (daysLeft <= 4) {
            dateColor = 'var(--red-text)'; //red
            subText = `${Math.floor(daysLeft)} days left`;
        } else {
            dateColor = 'var(--green-text)'; //green
            subText = `${Math.floor(daysLeft)} days left`;
        }
    }

    if (editingTaskId === task.todo_id) {
        return (
          <tr key={task.todo_id} className="task-row edit-mode-row" style={{ borderBottom: '1px solid var(--border-light)', fontSize: '18px' }}>
            <td style={{ padding: '10px' }}>
              <input 
                 type="text" 
                 value={editFormData.todo_name} 
                 onChange={(e) => setEditFormData({...editFormData, todo_name: e.target.value})} 
                 style={{ width: '100%', padding: '5px', boxSizing: 'border-box', marginBottom: '5px', fontWeight: 'bold' }}
              />
              <input 
                 type="text" 
                 placeholder="Category/Tag"
                 value={editFormData.category} 
                 onChange={(e) => setEditFormData({...editFormData, category: e.target.value})} 
                 style={{ width: '100%', padding: '4px', boxSizing: 'border-box', fontSize: '12px', backgroundColor: 'var(--secondary-bg)', borderRadius: '4px', border: '1px solid var(--border-color)' }}
              />
            </td>
            <td style={{ padding: '10px' }}>
              <input 
                 type="text" 
                 placeholder="No description"
                 value={editFormData.todo_desc === "No description" ? "" : editFormData.todo_desc} 
                 onChange={(e) => setEditFormData({...editFormData, todo_desc: e.target.value})} 
                 style={{ width: '100%', padding: '5px', boxSizing: 'border-box' }}
              />
            </td>
            <td style={{ padding: '10px' }}>
              <input 
                 type="date" 
                 value={editFormData.deadline} 
                 onChange={(e) => setEditFormData({...editFormData, deadline: e.target.value})} 
                 style={{ width: '100%', padding: '5px', boxSizing: 'border-box' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', marginTop: '8px', fontSize: '12px', cursor: 'pointer', color: 'var(--red-text)', fontWeight: 'bold' }}>
                <input 
                  type="checkbox" 
                  checked={editFormData.priority === 1}
                  onChange={(e) => setEditFormData({...editFormData, priority: e.target.checked ? 1 : 3})}
                  style={{ marginRight: '5px' }}
                />
                High Priority
              </label>
            </td>
            <td style={{ padding: '10px', textAlign: 'right', minWidth: '140px' }}>
              <button onClick={() => saveEdit(task)} title="Save changes" className="action-btn save-btn" style={{ background: 'none', border: 'none', color: 'var(--text-color)', fontSize: '20px', cursor: 'pointer', marginRight: '10px', fontWeight: 'bold' }}>✔</button>
              <button onClick={() => setEditingTaskId(null)} title="Cancel" className="action-btn delete-btn" style={{ background: 'none', border: 'none', color: 'var(--text-color)', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            </td>
          </tr>
        );
    }

    return (
      <tr key={task.todo_id} className="task-row" style={{ borderBottom: '1px solid var(--border-light)', fontSize: '18px' }}>
        <td style={{ padding: '10px' }}>
          <span 
            onClick={() => toggleTask(task)}
            style={{
              cursor: "pointer",
              textDecoration: task.is_completed ? "line-through" : "none",
              fontWeight: 'bold',
              display: 'block',
              marginBottom: '4px'
            }}
          >
            {task.todo_name}
          </span>
          <span style={{
            backgroundColor: 'var(--secondary-bg)',
            color: 'var(--text-color)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'inline-block'
          }}>
            {task.category || 'General'}
          </span>
          {task.priority === 1 && (
            <span style={{ backgroundColor: 'var(--red-text)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block', marginLeft: '5px' }}>
              High Priority
            </span>
          )}
        </td>
        <td style={{ padding: '10px', color: 'var(--desc-text)', fontSize: '16px' }}>
          {task.todo_desc}
        </td>
        <td style={{ padding: '10px', color: dateColor, fontWeight: (daysLeft !== null && daysLeft <= 4 && !task.is_completed) ? 'bold' : 'normal' }}>
          {dateText}
          {subText && <><br/><span style={{fontSize: '14px'}}>{subText}</span></>}
        </td>
        <td style={{ padding: '10px', textAlign: 'right', minWidth: '140px' }}>
          <button 
            onClick={() => startEdit(task)}
            title="Edit task"
            className="action-btn edit-btn"
            style={{ background: 'none', border: 'none', color: 'var(--text-color)', fontSize: '20px', cursor: 'pointer', marginRight: '10px' }}
          >
            ✎
          </button>
          <button 
            onClick={() => setTaskToDelete(task)}
            title="Delete task"
            className="action-btn delete-btn"
            style={{ background: 'none', border: 'none', color: 'var(--text-color)', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </td>
      </tr>
    );
  };

  const getHeaderTitle = () => {
    if (activeView === 'Dashboard') {
      let uName = "USER";
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.sub) {
            uName = payload.sub.toUpperCase();
          }
        } catch(e) {}
      }
      return `Welcome ${uName}`;
    }
    return activeView;
  };
  const getStats = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    return tasks.reduce((acc, t) => {
      acc.total += 1;
      if (t.is_completed) {
        acc.completed += 1;
        if (t.deadline && t.deadline < todayStr) acc.late += 1;
        else acc.on_time += 1;
      } else {
        acc.pending += 1;
        if (t.deadline && t.deadline < todayStr) acc.overdue += 1;
      }
      return acc;
    }, { total: 0, completed: 0, on_time: 0, late: 0, pending: 0, overdue: 0 });
  };

  const stats = tasks.length > 0 ? getStats() : null;

  return (
    <div className="app-container" style={{ fontFamily: 'sans-serif' }}>
      {loading && renderLoadingOverlay("Loading your tasks...")}
      <style>{`
        .task-row .action-btn { opacity: 0; transition: opacity 0.2s, filter 0.2s; filter: grayscale(100%) opacity(50%); }
        .task-row:hover .action-btn { opacity: 1; }
        .edit-mode-row .action-btn { opacity: 1; }
        .task-row .edit-btn:hover { filter: grayscale(0%) opacity(100%); }
        .task-row .save-btn:hover { filter: grayscale(0%) opacity(100%); color: green !important; }
        .task-row .delete-btn:hover { filter: grayscale(0%) opacity(100%); color: red !important; }
      `}</style>
      
      {/* Sidebar */}
      <div className="sidebar">
        <h2 style={{ margin: '0 0 30px 0', paddingLeft: '10px' }}>LambdaCore</h2>
        
        <button 
          className={`sidebar-nav-btn ${activeView === 'Dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('Dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={`sidebar-nav-btn ${activeView === 'Tasks' ? 'active' : ''}`}
          onClick={() => setActiveView('Tasks')}
        >
          ✅ Tasks
        </button>
        <button 
          className={`sidebar-nav-btn ${activeView === 'Stats' ? 'active' : ''}`}
          onClick={() => setActiveView('Stats')}
        >
          📈 Analytics
        </button>
        <button 
          className={`sidebar-nav-btn ${activeView === 'Calendar' ? 'active' : ''}`}
          onClick={() => setActiveView('Calendar')}
        >
          📅 Calendar
        </button>

        <div className="sidebar-utils" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => setShowSettingsModal(true)} className="sidebar-nav-btn" style={{ justifyContent: 'center', backgroundColor: 'var(--btn-gray)', color: 'white' }}>
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <h1 style={{ margin: '0 0 20px 0', fontSize: '28px' }}>{getHeaderTitle()}</h1>
        {error && <p style={{ color: 'var(--red-text)', fontStyle: 'italic', marginBottom: '15px' }}>{error}</p>}

        {activeView === 'Dashboard' && (
          <div>
            {stats && (
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '30px', padding: '20px', backgroundColor: 'var(--secondary-bg)', borderRadius: '8px', fontSize: '15px' }}>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <div style={{ color: 'var(--desc-text)', marginBottom: '5px' }}>Total Tasks</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.total}</div>
                </div>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <div style={{ color: 'var(--green-text)', marginBottom: '5px' }}>On-Time</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.on_time}</div>
                </div>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <div style={{ color: 'var(--red-text)', marginBottom: '5px' }}>Late</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.late}</div>
                </div>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <div style={{ color: 'var(--desc-text)', marginBottom: '5px' }}>Pending</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.pending}</div>
                </div>
              </div>
            )}
            
            <>
              <h2 style={{ color: 'var(--text-color)', marginTop: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Upcoming Deadlines</h2>
              {upcomingTasks.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', textAlign: 'left', marginBottom: '30px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--tertiary-bg)', borderBottom: '2px solid var(--border-color)' }}>
                      <th style={{ padding: '10px', width: '30%' }}>Name</th>
                      <th style={{ padding: '10px', width: '35%' }}>Description</th>
                      <th style={{ padding: '10px', width: '20%' }}>Deadline</th>
                      <th style={{ padding: '10px', width: '15%', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingTasks.map(renderTask)}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '30px', textAlign: 'center', backgroundColor: 'var(--tertiary-bg)', borderRadius: '8px', marginTop: '15px', marginBottom: '30px' }}>
                  <p style={{ color: 'var(--desc-text)', fontSize: '16px', margin: 0 }}>No upcoming deadlines!</p>
                </div>
              )}
            </>


          </div>
        )}

        {activeView === 'Tasks' && (
          <div>
            <form onSubmit={addTask} style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap', backgroundColor: 'var(--secondary-bg)', padding: '15px', borderRadius: '8px' }}>
              <input type="text" placeholder="Todo name" value={inputValue} onChange={(e) => setInputValue(e.target.value)} style={{ flex: 2, padding: '10px', fontSize: '15px', minWidth: '150px' }} />
              <input type="text" placeholder="Description" value={descValue} onChange={(e) => setDescValue(e.target.value)} style={{ flex: 2, padding: '10px', fontSize: '15px', minWidth: '150px' }} />
              <input type="text" placeholder="Category / Tag" value={categoryValue} onChange={(e) => setCategoryValue(e.target.value)} style={{ flex: 1, padding: '10px', fontSize: '15px', minWidth: '100px' }} />
              <input type="text" placeholder="Deadline" onFocus={(e) => (e.target.type = "date")} onBlur={(e) => (e.target.type = e.target.value ? "date" : "text")} value={deadlineValue} onChange={(e) => setDeadlineValue(e.target.value)} style={{ flex: 1, padding: '10px', fontSize: '15px', minWidth: '120px' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: '0 10px' }}>
                <input type="checkbox" checked={isHighPriority} onChange={(e) => setIsHighPriority(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                High Priority
              </label>
              <button type="submit" title="Add task" style={{ backgroundColor: 'var(--btn-green)', color: 'white', border: 'none', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold', borderRadius: '6px' }}>Add</button>
            </form>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', marginBottom: '15px', borderBottom: '1px solid var(--border-color)' }}>
              <input type="text" placeholder="🔍 Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: '8px', fontSize: '14px', minWidth: '200px' }} />
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '6px' }}>
                  {[...new Set(["All", ...tasks.map(t => t.category || "General")])].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <input type="date" value={dueBeforeFilter} onChange={(e) => setDueBeforeFilter(e.target.value)} style={{ padding: '6px' }} />
                {dueBeforeFilter && <button onClick={() => setDueBeforeFilter("")} style={{ background: 'none', border: 'none', color: 'var(--red-text)', cursor: 'pointer' }}>✕</button>}
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <input type="checkbox" checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)} style={{ marginRight: '8px' }} /> Hide Completed
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ color: 'var(--red-text)', marginTop: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>High Priority Tasks ({highPriorityTasks.length})</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--tertiary-bg)', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '10px', width: '30%' }}>Name</th>
                    <th style={{ padding: '10px', width: '35%' }}>Description</th>
                    <th 
                      style={{ padding: '10px', width: '20%', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => cycleSort(hpSortDir, setHpSortDir)}
                    >
                      Deadline <span style={{ fontSize: '14px', marginLeft: '4px' }}>{getSortIcon(hpSortDir)}</span>
                    </th>
                    <th style={{ padding: '10px', width: '15%', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {highPriorityTasks.length === 0 ? <tr><td colSpan="4" style={{ padding: '30px 10px', color: 'var(--desc-text)', textAlign: 'center', fontStyle: 'italic' }}>No high priority tasks. Enjoy your peace of mind!</td></tr> : highPriorityTasks.map(renderTask)}
                </tbody>
              </table>
            </div>

            <h2 style={{ marginTop: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Normal Tasks ({normalTasks.length})</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--tertiary-bg)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '10px', width: '30%' }}>Name</th>
                  <th style={{ padding: '10px', width: '35%' }}>Description</th>
                  <th style={{ padding: '10px', width: '20%', cursor: 'pointer' }} onClick={() => cycleSort(normalSortDir, setNormalSortDir)}>
                    Deadline <span style={{ fontSize: '14px' }}>{getSortIcon(normalSortDir)}</span>
                  </th>
                  <th style={{ padding: '10px', width: '15%', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {normalTasks.length === 0 ? <tr><td colSpan="4" style={{ padding: '30px 10px', color: 'var(--desc-text)', textAlign: 'center', fontStyle: 'italic' }}>You're all caught up! Add a new task above to get started.</td></tr> : normalTasks.map(renderTask)}
              </tbody>
            </table>
          </div>
        )}

        {activeView === 'Stats' && (
          <div>
            {stats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, padding: '20px', backgroundColor: 'var(--secondary-bg)', borderRadius: '8px', borderLeft: '4px solid var(--link-color)', minWidth: '200px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: 'var(--desc-text)' }}>Total Pipeline</h3>
                    <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{stats.total} <span style={{fontSize: '16px', fontWeight: 'normal'}}>tasks</span></div>
                  </div>
                  <div style={{ flex: 1, padding: '20px', backgroundColor: 'var(--secondary-bg)', borderRadius: '8px', borderLeft: '4px solid var(--green-text)', minWidth: '200px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: 'var(--desc-text)' }}>Completed</h3>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--green-text)' }}>{stats.completed}</div>
                    <div style={{ fontSize: '14px', marginTop: '5px' }}>{stats.on_time} On-Time, {stats.late} Late</div>
                  </div>
                  <div style={{ flex: 1, padding: '20px', backgroundColor: 'var(--secondary-bg)', borderRadius: '8px', borderLeft: '4px solid var(--red-text)', minWidth: '200px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: 'var(--desc-text)' }}>Overdue</h3>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--red-text)' }}>{stats.overdue}</div>
                  </div>
                </div>

                <div style={{ padding: '20px', backgroundColor: 'var(--secondary-bg)', borderRadius: '8px', height: '400px' }}>
                  <h3 style={{ margin: '0 0 20px 0', color: 'var(--desc-text)' }}>Task Distribution</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed (On-Time)', value: stats.on_time },
                          { name: 'Completed (Late)', value: stats.late },
                          { name: 'Pending', value: stats.pending },
                          { name: 'Overdue', value: stats.overdue },
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[
                          { name: 'Completed (On-Time)', value: stats.on_time },
                          { name: 'Completed (Late)', value: stats.late },
                          { name: 'Pending', value: stats.pending },
                          { name: 'Overdue', value: stats.overdue },
                        ].filter(d => d.value > 0).map((entry, index) => {
                          const COLORS = {
                            'Completed (On-Time)': 'var(--green-text)',
                            'Completed (Late)': '#d39e00',
                            'Pending': 'var(--link-color)',
                            'Overdue': 'var(--red-text)'
                          };
                          return <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />;
                        })}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--tertiary-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-color)' }}
                        itemStyle={{ color: 'var(--text-color)' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

              </div>
            ) : (
              <p>Loading analytics...</p>
            )}
          </div>
        )}

        {activeView === 'Calendar' && (
          <div style={{ padding: '20px', backgroundColor: 'var(--secondary-bg)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} style={{ padding: '8px 15px', backgroundColor: 'var(--tertiary-bg)', color: 'var(--text-color)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>◀ Prev</button>
              <h2 style={{ margin: 0 }}>{["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} style={{ padding: '8px 15px', backgroundColor: 'var(--tertiary-bg)', color: 'var(--text-color)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Next ▶</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} style={{ fontWeight: 'bold', textAlign: 'center', padding: '10px 0', borderBottom: '2px solid var(--border-color)' }}>{d}</div>
              ))}
              {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} style={{ minHeight: '100px', backgroundColor: 'var(--bg-color)', borderRadius: '4px', opacity: 0.3 }} />
              ))}
              {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                const d = i + 1;
                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dayTasks = tasks.filter(t => t.deadline === dateStr);
                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                
                return (
                  <div key={d} style={{ 
                    minHeight: '100px', backgroundColor: 'var(--bg-color)', borderRadius: '4px', padding: '5px',
                    border: isToday ? '2px solid var(--green-text)' : '1px solid var(--border-color)',
                    display: 'flex', flexDirection: 'column'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px', color: isToday ? 'var(--green-text)' : 'var(--text-color)', fontSize: '14px', textAlign: 'right' }}>{d}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '120px' }}>
                      {dayTasks.map(t => (
                        <div key={t.todo_id} style={{ 
                          fontSize: '11px', padding: '3px 5px', borderRadius: '3px', 
                          backgroundColor: t.is_completed ? 'var(--btn-gray)' : (t.priority === 1 ? '#dc3545' : 'var(--btn-green)'),
                          color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          textDecoration: t.is_completed ? 'line-through' : 'none',
                          cursor: 'pointer'
                        }} title={t.todo_name} onClick={() => setCalendarTaskPopup(t)}>
                          {t.todo_name}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
      
      {taskToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 10000,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-color)', padding: '30px', borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)', textAlign: 'center', maxWidth: '400px', width: '90%'
          }}>
            <h2 style={{ marginTop: 0, color: '#dc3545' }}>Confirm Deletion</h2>
            <p style={{ color: 'var(--text-color)', marginBottom: '25px', fontSize: '16px' }}>
              Are you sure you want to delete "<strong>{taskToDelete.todo_name}</strong>"?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
              <button 
                onClick={() => setTaskToDelete(null)}
                style={{ padding: '10px 20px', backgroundColor: 'var(--btn-gray)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  deleteTask(taskToDelete.todo_id);
                  setTaskToDelete(null);
                }}
                style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {calendarTaskPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 10000,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-color)', padding: '30px', borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)', textAlign: 'left', maxWidth: '400px', width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <h2 style={{ margin: 0, color: 'var(--text-color)' }}>{calendarTaskPopup.todo_name}</h2>
              <button onClick={() => setCalendarTaskPopup(null)} style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-color)', cursor: 'pointer' }}>✕</button>
            </div>
            
            {calendarTaskPopup.priority === 1 && (
              <span style={{ backgroundColor: 'var(--red-text)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block', marginBottom: '15px' }}>
                High Priority
              </span>
            )}
            
            <p style={{ color: 'var(--desc-text)', fontSize: '16px', lineHeight: '1.5', marginBottom: '20px' }}>
              {calendarTaskPopup.todo_desc || "No description provided."}
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
              <span style={{ color: 'var(--text-color)', fontSize: '14px' }}>
                <strong>Category:</strong> {calendarTaskPopup.category || "General"}
              </span>
              <span style={{ color: calendarTaskPopup.is_completed ? 'var(--green-text)' : 'var(--text-color)', fontSize: '14px', fontWeight: 'bold' }}>
                {calendarTaskPopup.is_completed ? "✓ Completed" : "Pending"}
              </span>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 10000,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-color)', padding: '30px', borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)', textAlign: 'left', maxWidth: '350px', width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ margin: 0, color: 'var(--text-color)' }}>Settings</h2>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-color)', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: 'var(--tertiary-bg)', borderRadius: '6px', cursor: 'pointer' }}>
                <span style={{ color: 'var(--text-color)', fontWeight: 'bold' }}>{isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
                <input 
                  type="checkbox" 
                  checked={isDarkMode} 
                  onChange={() => setIsDarkMode(!isDarkMode)} 
                  style={{ transform: 'scale(1.2)' }}
                />
              </label>

              <button 
                onClick={() => { downloadCSV(); setShowSettingsModal(false); }} 
                style={{ padding: '12px', backgroundColor: 'var(--btn-cyan)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', textAlign: 'center' }}
              >
                ⬇️ Export Tasks to CSV
              </button>

              <button 
                onClick={handleLogout} 
                style={{ padding: '12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', textAlign: 'center' }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

