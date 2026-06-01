import { useState, useEffect } from "react";

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

  
  //auth states
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginView, setIsLoginView] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/todos/stats`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token, tasks]);

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
      setTasks(prev => [...prev, savedTask]);
      setInputValue("");
      setDescValue("");
      setDeadlineValue("");
      setCategoryValue("General");
      setIsHighPriority(false);
    })
    .catch(err => setError(err.message));
  }

  //toggle
  function toggleTask(task) {
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
    .then(res => res.json())
    .then(savedTask => {
      setTasks(prev => prev.map(t => t.todo_id === task.todo_id ? savedTask : t));
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

    fetch(`${API_URL}/todos/${task.todo_id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(updatedTask)
    })
    .then(res => res.json())
    .then(savedTask => {
      setTasks(prev => prev.map(t => t.todo_id === task.todo_id ? savedTask : t));
      setEditingTaskId(null);
    });
  };

  //delete
  function deleteTask(id) {
    fetch(`${API_URL}/todos/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
    .then(() => {
      setTasks(prev => prev.filter(t => t.todo_id !== id));
    });
  }

  //render auth screen
  if (!token) {
    return (
      <div style={{ textAlign: 'center', maxWidth: '400px', margin: '50px auto', fontFamily: 'sans-serif' }}>
        <h1>{isLoginView ? "Login" : "Register"}</h1>
        {successMsg && <h3 style={{ color: 'var(--green-text)' }}>{successMsg}</h3>}
        {error && <p style={{ color: 'var(--red-text)' }}>{error}</p>}
        <form onSubmit={handleAuth}>
          <div style={{ marginBottom: '10px' }}>
            <input 
              type="text" 
              placeholder="Username"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <input 
              type="password" 
              placeholder="Password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" disabled={isAuthLoading} style={{ padding: '8px', width: '100%', backgroundColor: isAuthLoading ? 'var(--btn-gray)' : 'var(--btn-green)', color: 'white', border: 'none', cursor: isAuthLoading ? 'not-allowed' : 'pointer', opacity: isAuthLoading ? 0.7 : 1 }}>
            {isAuthLoading ? "Processing..." : (isLoginView ? "Login" : "Register")}
          </button>
        </form>
        <button onClick={() => { setIsLoginView(!isLoginView); setError(null); setSuccessMsg(null); }} style={{ marginTop: '15px', background: 'none', border: 'none', color: 'var(--link-color)', textDecoration: 'underline', cursor: 'pointer' }}>
          {isLoginView ? "Switch to Register" : "Switch to Login"}
        </button>
        {isAuthLoading && renderLoadingOverlay("Authenticating...")}
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
            onClick={() => deleteTask(task.todo_id)}
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

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label className="sidebar-nav-btn" style={{ cursor: 'pointer', margin: 0, justifyContent: 'center' }}>
            <span>{isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
            <input 
              type="checkbox" 
              checked={isDarkMode} 
              onChange={() => setIsDarkMode(!isDarkMode)} 
              style={{ display: 'none' }}
            />
          </label>
          <button onClick={downloadCSV} className="sidebar-nav-btn" style={{ justifyContent: 'center', backgroundColor: 'var(--btn-cyan)', color: 'white' }}>
            ⬇️ Export CSV
          </button>
          <button onClick={handleLogout} className="sidebar-nav-btn" style={{ justifyContent: 'center', backgroundColor: 'var(--btn-gray)', color: 'white' }}>
            Logout
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
            
            {upcomingTasks.length > 0 && (
              <>
                <h2 style={{ color: 'var(--text-color)', marginTop: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Upcoming Deadlines</h2>
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
              </>
            )}


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

                {stats.completed > 0 && (
                  <div style={{ padding: '20px', backgroundColor: 'var(--tertiary-bg)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px 0' }}>Data Management</h3>
                      <p style={{ margin: 0, color: 'var(--desc-text)', fontSize: '14px' }}>You have {stats.completed} completed tasks taking up space.</p>
                    </div>
                    <button onClick={async () => {
                      await fetch(`${API_URL}/todos/completed`, { method: 'DELETE', headers: { "Authorization": `Bearer ${token}` } });
                      setTasks(prev => prev.filter(t => !t.is_completed));
                    }} style={{ backgroundColor: '#dc3545', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                      Delete All Completed Tasks
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p>Loading analytics...</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

