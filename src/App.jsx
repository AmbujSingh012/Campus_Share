import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Home from "./pages/Home";
import Resources from "./pages/Resources";
import PostResource from "./pages/PostResource";
import Tasks from "./pages/Tasks";
import Profile from "./pages/Profile";
import TaskPayment from "./pages/TaskPayment";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route path="/home" element={<Home />} />

      <Route path="/resources" element={<Resources />} />

      <Route path="/post-resource" element={<PostResource />} />

      <Route path="/tasks" element={<Tasks />} />

      <Route path="/profile" element={<Profile />} />
      <Route path="/task-payment" element={<TaskPayment />} />
    </Routes>
  );
}

export default App;