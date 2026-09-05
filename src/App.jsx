import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Home from "./pages/Home";
import Resources from "./pages/Resources";
import Tasks from "./pages/Tasks";
import Profile from "./pages/Profile";
import PostResource from "./pages/PostResource";
import TaskPayment from "./pages/TaskPayment";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />

      <Route path="/home" element={<Home />} />
      <Route path="/resources" element={<Resources />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/profile" element={<Profile />} />

      {/* Post Resource */}
      <Route path="/post" element={<PostResource />} />
      <Route path="/post-resource" element={<PostResource />} />

      {/* Task Payment */}
      <Route path="/task-payment" element={<TaskPayment />} />
    </Routes>
  );
}

export default App;