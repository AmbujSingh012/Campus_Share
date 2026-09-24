import { Routes, Route } from "react-router-dom";

import CollegeSelect from "./pages/CollegeSelect";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Resources from "./pages/Resources";
import ResourceDetails from "./pages/ResourceDetails";
import Tasks from "./pages/Tasks";
import Profile from "./pages/Profile";
import PostResource from "./pages/PostResource";
import TaskPayment from "./pages/TaskPayment";
import CampusHelper from "./pages/CampusHelper";
import PostTask from "./pages/PostTask";
import MyResources from "./pages/MyResources";
import MyTasks from "./pages/MyTasks";
import EditResource from "./pages/EditResource";
import TransactionHistory from "./pages/TransactionHistory";
import ConnectionDetails from "./pages/ConnectionDetails";
import ResetPassword from "./pages/ResetPassword";
function App() {
  return (
    <Routes>
      <Route path="/" element={<CollegeSelect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/register" element={<Register />} />

      <Route path="/home" element={<Home />} />
      <Route path="/resources" element={<Resources />} />
      <Route path="/resources/:id" element={<ResourceDetails />} />
      <Route path="/my-resources" element={<MyResources />} />
      <Route path="/my-tasks" element={<MyTasks />} />
      <Route
  path="/resources/:id/edit"
  element={<EditResource />}
/>
      <Route path="/tasks" element={<Tasks />} />
      <Route
  path="/connection-details"
  element={<ConnectionDetails />}
/>
      <Route path="/profile" element={<Profile />} />
      <Route
  path="/transaction-history"
  element={<TransactionHistory />}
/>
      <Route path="/campus-helper" element={<CampusHelper />} />
      <Route path="/post-task" element={<PostTask />} />

      <Route path="/post" element={<PostResource />} />
      <Route path="/post-resource" element={<PostResource />} />

      <Route path="/task-payment" element={<TaskPayment />} />
    </Routes>
  );
}

export default App;