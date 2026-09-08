import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Resources from "./pages/Resources";
import Tasks from "./pages/Tasks";
import Profile from "./pages/Profile";
import PostResource from "./pages/PostResource";
import TaskPayment from "./pages/TaskPayment";
import CampusHelper from "./pages/CampusHelper";
import PostTask from "./pages/PostTask";
function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/home" element={<Home />} />
      <Route path="/resources" element={<Resources />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/campus-helper" element={<CampusHelper />} />
      <Route path="/post-task" element={<PostTask />} />

      <Route path="/post" element={<PostResource />} />
      <Route path="/post-resource" element={<PostResource />} />

      <Route path="/task-payment" element={<TaskPayment />} />
    </Routes>
  );
}

export default App;