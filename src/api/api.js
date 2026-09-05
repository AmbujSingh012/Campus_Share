const API_BASE_URL = "http://localhost:3000";

export async function getTasks() {
  const response = await fetch(`${API_BASE_URL}/api/tasks`);

  if (!response.ok) {
    throw new Error("Failed to fetch tasks");
  }

  return response.json();
}

export async function getResources() {
  const response = await fetch(`${API_BASE_URL}/api/resources`);

  if (!response.ok) {
    throw new Error("Failed to fetch resources");
  }

  return response.json();
}

export async function getTaskById(id) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch task");
  }

  return response.json();
}

export async function getResourceById(id) {
  const response = await fetch(`${API_BASE_URL}/api/resources/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch resource");
  }

  return response.json();
}

export async function createTask(taskData) {
  const response = await fetch(`${API_BASE_URL}/api/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(taskData),
  });

  if (!response.ok) {
    throw new Error("Failed to create task");
  }

  return response.json();
}

export async function createResource(resourceData) {
  const response = await fetch(`${API_BASE_URL}/api/resources`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(resourceData),
  });

  if (!response.ok) {
    throw new Error("Failed to create resource");
  }

  return response.json();
}