const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://campusshare-production-57e5.up.railway.app";

// =====================================================
// GET JWT TOKEN / AUTH HEADERS
// =====================================================

function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// =====================================================
// GET TASKS
// =====================================================

export async function getTasks() {
  const response = await fetch(
    `${API_BASE_URL}/api/tasks`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch tasks");
  }

  return response.json();
}

// =====================================================
// GET RESOURCES
// =====================================================

export async function getResources() {
  const response = await fetch(
    `${API_BASE_URL}/api/resources`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch resources");
  }

  return response.json();
}

// =====================================================
// GET TASK BY ID
// =====================================================

export async function getTaskById(id) {
  const response = await fetch(
    `${API_BASE_URL}/api/tasks/${id}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch task");
  }

  return response.json();
}

// =====================================================
// GET RESOURCE BY ID
// =====================================================

export async function getResourceById(id) {
  const response = await fetch(
    `${API_BASE_URL}/api/resources/${id}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch resource");
  }

  return response.json();
}

// =====================================================
// CREATE TASK
// =====================================================

export async function createTask(taskData) {
  const response = await fetch(
    `${API_BASE_URL}/api/tasks`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(taskData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to create task"
    );
  }

  return data;
}

// =====================================================
// CREATE RESOURCE
// WITH IMAGE UPLOAD
// =====================================================

export async function createResource(resourceData) {
  const token = localStorage.getItem("token");

  const formData = new FormData();

  formData.append(
    "title",
    resourceData.title
  );

  formData.append(
    "description",
    resourceData.description || ""
  );

  formData.append(
    "category",
    resourceData.category
  );

  formData.append(
    "location",
    resourceData.location || ""
  );

  formData.append(
    "availability",
    resourceData.availability || "Available"
  );

  formData.append(
    "condition",
    resourceData.condition || "Excellent"
  );

  formData.append(
    "borrowingFee",
    resourceData.borrowingFee || "0"
  );

  if (resourceData.image) {
    formData.append(
      "image",
      resourceData.image
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/api/resources`,
    {
      method: "POST",

      // IMPORTANT:
      // Do NOT set Content-Type manually for FormData.
      headers: {
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },

      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to create resource"
    );
  }

  return data;
}

// =====================================================
// BORROW RESOURCE
// Permanent database-based borrowing
// =====================================================

export async function borrowResource(resourceId) {
  const response = await fetch(
    `${API_BASE_URL}/api/resources/${resourceId}/borrow`,
    {
      method: "POST",

      headers: getAuthHeaders(),

      body: JSON.stringify({}),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to borrow resource"
    );
  }

  return data;
}

// =====================================================
// ACCEPT TASK
// =====================================================

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
    throw new Error(
      data.message ||
        "Failed to accept task"
    );
  }

  return data;
}

// =====================================================
// GET TASK CONNECTION
// =====================================================

export async function getTaskConnection(taskId) {
  const response = await fetch(
    `${API_BASE_URL}/api/tasks/${taskId}/connection`,
    {
      headers: getAuthHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to fetch connection details"
    );
  }

  return data;
}

// =====================================================
// CREATE RAZORPAY ORDER
// =====================================================

export async function createRazorpayOrder({
  taskId = null,
  resourceId = null,
}) {
  const response = await fetch(
    `${API_BASE_URL}/api/payments/create-order`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        task_id: taskId,
        resource_id: resourceId,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to create Razorpay order"
    );
  }

  return data;
}

// =====================================================
// VERIFY RAZORPAY PAYMENT
// =====================================================

export async function verifyRazorpayPayment({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) {
  const response = await fetch(
    `${API_BASE_URL}/api/payments/verify-razorpay`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to verify Razorpay payment"
    );
  }

  return data;
}

// =====================================================
// GET PAYMENT RECEIPT
// =====================================================

export async function getMyPaymentReceipts() {
  const response = await fetch(
    `${API_BASE_URL}/api/payments/my-receipts`,
    {
      headers: getAuthHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to fetch payment receipts"
    );
  }

  return data;
}

export async function getPaymentReceipt(paymentId) {
  const response = await fetch(
    `${API_BASE_URL}/api/payments/receipt/${paymentId}`,
    {
      headers: getAuthHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to fetch payment receipt"
    );
  }

  return data;
}
export async function cancelRazorpayPayment(paymentId) {
  const response = await fetch(
    `${API_BASE_URL}/api/payments/cancel/${paymentId}`,
    {
      method: "PUT",
      headers: getAuthHeaders(),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to cancel payment"
    );
  }

  return data;
}

export default API_BASE_URL;
