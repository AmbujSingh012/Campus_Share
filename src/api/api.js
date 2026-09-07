const API_BASE_URL = "http://localhost:3000";

// Get JWT token saved after login
function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// GET TASKS
export async function getTasks() {
  const response = await fetch(`${API_BASE_URL}/api/tasks`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch tasks");
  }

  return response.json();
}

// GET RESOURCES
export async function getResources() {
  const response = await fetch(`${API_BASE_URL}/api/resources`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch resources");
  }

  return response.json();
}

// GET TASK BY ID
export async function getTaskById(id) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch task");
  }

  return response.json();
}

// GET RESOURCE BY ID
export async function getResourceById(id) {
  const response = await fetch(`${API_BASE_URL}/api/resources/${id}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch resource");
  }

  return response.json();
}

// CREATE TASK
export async function createTask(taskData) {
  const response = await fetch(`${API_BASE_URL}/api/tasks`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(taskData),
  });

  if (!response.ok) {
    throw new Error("Failed to create task");
  }

  return response.json();
}

// CREATE RESOURCE
export async function createResource(resourceData) {
  const response = await fetch(`${API_BASE_URL}/api/resources`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(resourceData),
  });

  if (!response.ok) {
    throw new Error("Failed to create resource");
  }

  return response.json();
}

// ACCEPT TASK
export async function acceptTask(taskId) {
  const response = await fetch(
    `${API_BASE_URL}/api/tasks/${taskId}/accept`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to accept task");
  }

  return data;
}
