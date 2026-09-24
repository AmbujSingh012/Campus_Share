import { useEffect, useMemo, useState } from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  Search,
  Plus,
  MapPin,
  Star,
  Package,
  ArrowLeft,
} from "lucide-react";
import {
  getResources,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getPaymentReceipt,
  getMyPaymentReceipts,
  cancelRazorpayPayment,
} from "../api";
import ResourceCard from "../components/ResourceCard";
import BottomNavigation from "../components/BottomNavigation";
import "./Resources.css";

function Resources() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const selectedResourceId = searchParams.get("resourceId");

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [borrowingId, setBorrowingId] = useState(null);

  const [paymentReceipts, setPaymentReceipts] = useState(() => {
    try {
      const savedReceipts = localStorage.getItem(
        "campusshare_payment_receipts"
      );

      if (savedReceipts) {
        return JSON.parse(savedReceipts);
      }

      const oldReceipt = localStorage.getItem(
        "campusshare_payment_receipt"
      );

      if (oldReceipt) {
        const parsedReceipt = JSON.parse(oldReceipt);

        if (parsedReceipt?.resource_id) {
          return {
            [parsedReceipt.resource_id]: parsedReceipt,
          };
        }
      }

      return {};
    } catch {
      return {};
    }
  });

  const [openReceiptId, setOpenReceiptId] = useState(null);

  useEffect(() => {
    const loadMyPaymentReceipts = async () => {
      try {
        const receiptData = await getMyPaymentReceipts();

        if (
          receiptData.success &&
          Array.isArray(receiptData.receipts)
        ) {
          const receiptMap = {};

          receiptData.receipts.forEach((receipt) => {
            if (receipt.resource_id) {
              receiptMap[receipt.resource_id] = receipt;
            }
          });

          setPaymentReceipts((previousReceipts) => ({
            ...previousReceipts,
            ...receiptMap,
          }));

          localStorage.setItem(
            "campusshare_payment_receipts",
            JSON.stringify(receiptMap)
          );
        }
      } catch (error) {
        console.error(
          "Payment receipts API error:",
          error
        );
      }
    };

    loadMyPaymentReceipts();
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const currentUser = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const selectedCollege = JSON.parse(
    localStorage.getItem("selectedCollege") || "null"
  );

  useEffect(() => {
  async function loadResources(showLoading = false) {
    try {
      if (showLoading) {
        setLoading(true);
      }

      setError("");

      const data = await getResources();

      if (data.success) {
        setResources(data.resources || []);
      } else {
        setError("Failed to load resources");
      }
    } catch (err) {
      console.error("Resources API error:", err);

      if (showLoading) {
        setError("Unable to connect to backend");
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  // Initial load
  loadResources(true);

  // Refresh when user comes back to this tab/page
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      loadResources(false);
    }
  };

  const handleWindowFocus = () => {
    loadResources(false);
  };

  document.addEventListener(
    "visibilitychange",
    handleVisibilityChange
  );

  window.addEventListener(
    "focus",
    handleWindowFocus
  );

  // Keep resource availability synchronized
  const refreshInterval = setInterval(() => {
    if (document.visibilityState === "visible") {
      loadResources(false);
    }
  }, 3000);

  return () => {
    document.removeEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.removeEventListener(
      "focus",
      handleWindowFocus
    );

    clearInterval(refreshInterval);
  };
}, []);

  /*
   * If Home page sends us to:
   * /resources?resourceId=4
   *
   * this effect finds resource-4 and scrolls directly to it.
   */
  useEffect(() => {
    if (
      loading ||
      !selectedResourceId ||
      resources.length === 0
    ) {
      return;
    }

    const targetResource = resources.find(
      (resource) =>
        String(resource.id) === String(selectedResourceId)
    );

    if (!targetResource) {
      return;
    }

    const scrollToResource = () => {
      const element = document.getElementById(
        `resource-${selectedResourceId}`
      );

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToResource);
    });
  }, [
    loading,
    selectedResourceId,
    resources,
  ]);

  const handleBorrow = async (resource) => {
    try {
      setBorrowingId(resource.id);
      setError("");

      if (typeof window.Razorpay !== "function") {
        throw new Error(
          "Razorpay Checkout is not available. Please refresh the page and try again."
        );
      }

      const orderData = await createRazorpayOrder({
        resourceId: resource.id,
      });

      if (!orderData.success || !orderData.order) {
        throw new Error(
          orderData.message ||
            "Unable to create payment order"
        );
      }

      const options = {
        key: orderData.razorpayKeyId,
        amount: orderData.order.amount,
        currency:
          orderData.order.currency || "INR",
        name: "CampusShare",
        description:
          orderData.payment?.title ||
          resource.title ||
          "Campus Resource Borrowing",
        order_id: orderData.order.id,

        prefill: {
          name: currentUser?.name || "",
          email: currentUser?.email || "",
          contact: currentUser?.mobile || "",
        },

        notes: {
          resource_id: String(resource.id),
          resource_title: resource.title || "",
          location: resource.location || "",
        },

        theme: {
          color: "#2563eb",
        },

        handler: async function (response) {
          try {
            const verification =
              await verifyRazorpayPayment({
                razorpay_order_id:
                  response.razorpay_order_id,
                razorpay_payment_id:
                  response.razorpay_payment_id,
                razorpay_signature:
                  response.razorpay_signature,
              });

            if (!verification.success) {
              throw new Error(
                verification.message ||
                  "Payment verification failed"
              );
            }

            setResources(
              (previousResources) =>
                previousResources.map((item) =>
                  item.id === resource.id
                    ? {
                        ...item,
                        availability: "Borrowed",
                        borrowed_by:
                          currentUser?.id,
                      }
                    : item
                )
            );

            const paymentId =
              verification.payment?.id ||
              verification.payment_id;

            if (!paymentId) {
              throw new Error(
                "Payment succeeded, but receipt information was not returned."
              );
            }

            const receiptData =
              await getPaymentReceipt(paymentId);

            if (
              !receiptData.success ||
              !receiptData.receipt
            ) {
              throw new Error(
                receiptData.message ||
                  "Payment succeeded, but the receipt could not be loaded."
              );
            }

            const receipt = {
              ...receiptData.receipt,
              resource_id: resource.id,
            };

            setPaymentReceipts(
              (previousReceipts) => {
                const updatedReceipts = {
                  ...previousReceipts,
                  [resource.id]: receipt,
                };

                localStorage.setItem(
                  "campusshare_payment_receipts",
                  JSON.stringify(updatedReceipts)
                );

                return updatedReceipts;
              }
            );

            setOpenReceiptId(resource.id);
            setError("");
          } catch (verificationError) {
            console.error(
              "Razorpay verification error:",
              verificationError
            );

            setError(
              verificationError.message ||
                "Payment was completed but verification failed."
            );
          } finally {
            setBorrowingId(null);
          }
        },

        modal: {
          ondismiss: async function () {
            try {
              const paymentId =
                orderData.payment?.id ||
                orderData.payment_id;

              if (paymentId) {
                await cancelRazorpayPayment(
                  paymentId
                );
              }
            } catch (cancelError) {
              console.error(
                "Failed to cancel pending payment:",
                cancelError
              );
            } finally {
              setBorrowingId(null);
            }
          },
        },
      };

      const razorpayCheckout =
        new window.Razorpay(options);

      razorpayCheckout.on(
        "payment.failed",
        function (response) {
          console.error(
            "Razorpay payment failed:",
            response.error
          );

          setError(
            response.error?.description ||
              "Payment failed. Please try again."
          );

          setBorrowingId(null);
        }
      );

      razorpayCheckout.open();
    } catch (err) {
      console.error(
        "Borrow resource payment error:",
        err
      );

      setError(
        err.message ||
          "Unable to start resource payment"
      );

      setBorrowingId(null);
    }
  };

  const categories = useMemo(() => {
    const uniqueCategories = resources
      .map((resource) => resource.category)
      .filter(Boolean);

    return ["All", ...new Set(uniqueCategories)];
  }, [resources]);

  const filteredResources = useMemo(() => {
    const query =
      searchQuery.trim().toLowerCase();

    return resources.filter((resource) => {
      const matchesCategory =
        activeCategory === "All" ||
        String(
          resource.category || ""
        ).toLowerCase() ===
          activeCategory.toLowerCase();

      const searchableText = [
        resource.title,
        resource.category,
        resource.description,
        resource.postedBy,
        resource.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query ||
        searchableText.includes(query);

      return (
        matchesCategory &&
        matchesSearch
      );
    });
  }, [
    resources,
    searchQuery,
    activeCategory,
  ]);

  const availableCount = resources.filter(
    (resource) => {
      const availability = String(
        resource.availability ||
          "Available"
      ).toLowerCase();

      return (
        availability !== "borrowed" &&
        !resource.borrowed_by
      );
    }
  ).length;

  if (loading) {
    return (
      <div className="resources-modern-page app-page-frame">
        <div className="resources-modern-shell">
          <div className="resources-loading">
            <div className="resources-spinner"></div>

            <h2>Loading your campus...</h2>

            <p>
              Finding resources shared by students.
            </p>
          </div>
        </div>

        <BottomNavigation active="resources" />
      </div>
    );
  }

  return (
    <div className="resources-modern-page">
      <div className="resources-modern-shell">

        <header className="resources-topbar">
          <button
            className="resources-back"
            onClick={() =>
              navigate("/home")
            }
            aria-label="Back to home"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="resources-campus">
            <span className="resources-campus-dot"></span>

            <span>
              {selectedCollege?.name ||
                "Your Campus"}
            </span>
          </div>

          <button
            className="resources-post-top"
            onClick={() =>
              navigate("/post-resource")
            }
          >
            <Plus size={18} />
            <span>Post</span>
          </button>
        </header>

        <main className="resources-modern-content">

          <section className="resources-hero">
            <div>
              <span className="resources-eyebrow">
                CAMPUS MARKETPLACE
              </span>

              <h1>
                Find what you
                <span> need.</span>
              </h1>

              <p>
                Borrow useful stuff from students
                around your campus. No hassle,
                just community.
              </p>
            </div>

            <div className="resources-hero-stat">
              <Package size={22} />

              <strong>
                {availableCount}
              </strong>

              <span>
                available now
              </span>
            </div>
          </section>

          <section className="resources-search-section">
            <div className="resources-search-box">
              <Search size={20} />

              <input
                type="text"
                placeholder="Search calculators, books, cycles..."
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
              />

              {searchQuery && (
                <button
                  className="resources-search-clear"
                  onClick={() =>
                    setSearchQuery("")
                  }
                >
                  Clear
                </button>
              )}
            </div>
          </section>

          <section className="resources-filter-section">
            <div className="resources-filter-header">
              <h2>
                Explore resources
              </h2>

              <span>
                {filteredResources.length}{" "}
                {filteredResources.length === 1
                  ? "item"
                  : "items"}
              </span>
            </div>

            <div className="resources-category-list">
              {categories.map(
                (category) => (
                  <button
                    key={category}
                    className={
                      activeCategory ===
                      category
                        ? "resources-category active"
                        : "resources-category"
                    }
                    onClick={() =>
                      setActiveCategory(
                        category
                      )
                    }
                  >
                    {category}
                  </button>
                )
              )}
            </div>
          </section>

          {error && (
            <div className="resources-error">
              <strong>
                Something went wrong
              </strong>

              <span>{error}</span>
            </div>
          )}

          {filteredResources.length ===
          0 ? (
            <section className="resources-empty">
              <div className="resources-empty-icon">
                <Package size={32} />
              </div>

              <h3>
                {searchQuery ||
                activeCategory !== "All"
                  ? "No resources found"
                  : "Nothing here yet"}
              </h3>

              <p>
                {searchQuery ||
                activeCategory !== "All"
                  ? "Try another search or category."
                  : "Be the first student to share something useful."}
              </p>
            </section>
          ) : (
            <section className="resources-grid">
              {filteredResources.map(
                (resource) => {
                  const isBorrowed =
                    String(
                      resource.availability ||
                        ""
                    ).toLowerCase() ===
                      "borrowed" ||
                    Boolean(
                      resource.borrowed_by
                    );

                  const isOwner =
                    Number(
                      currentUser?.id
                    ) ===
                    Number(
                      resource.user_id
                    );

                  const isBorrowing =
                    borrowingId ===
                    resource.id;

                  return (
                    <article
                      id={`resource-${resource.id}`}
                      className="resources-item"
                      key={resource.id}
                    >
                      <ResourceCard
                        name={resource.title}
                        description={
                          resource.description
                        }
                        category={
                          resource.category ||
                          "Not specified"
                        }
                        owner={
                          resource.postedBy ||
                          "Unknown"
                        }
                        rating={
                          resource.averageRating >
                          0
                            ? resource.averageRating
                            : "No ratings"
                        }
                        location={
                          resource.location ||
                          "Not specified"
                        }
                        imageUrl={
                          resource.image_url
                        }
                        onBorrow={() =>
                          handleBorrow(
                            resource
                          )
                        }
                      />

                      <div className="resources-item-details">

                        <h3 className="resources-resource-name">
                          {resource.title}
                        </h3>

                        <div className="resources-meta-row">
                          <span className="resources-location">
                            <MapPin size={14} />

                            {resource.location ||
                              "Campus"}
                          </span>

                          <span className="resources-rating">
                            <Star size={14} />

                            {resource.averageRating >
                            0
                              ? resource.averageRating
                              : "New"}
                          </span>
                        </div>

                        <p className="resources-description">
                          {resource.description ||
                            "A useful resource shared by a fellow student."}
                        </p>

                        <div className="resources-owner-row">
                          <div className="resources-avatar">
                            {String(
                              resource.postedBy ||
                                "S"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <small>
                              Shared by
                            </small>

                            <strong>
                              {resource.postedBy ||
                                "Student"}
                            </strong>
                          </div>
                        </div>

                        {isOwner ? (
                          <button
                            className="resources-status-button owner"
                            disabled
                          >
                            Your resource
                          </button>
                        ) : isBorrowed ? (
                          <button
                            className="resources-status-button borrowed"
                            disabled
                          >
                            ✓ Currently borrowed
                          </button>
                        ) : (
                          <button
                            className="resources-borrow-button"
                            onClick={() =>
                              handleBorrow(
                                resource
                              )
                            }
                            disabled={
                              isBorrowing
                            }
                          >
                            {isBorrowing
                              ? "Borrowing..."
                              : "Borrow resource"}
                          </button>
                        )}
                      </div>

                      {isBorrowed &&
                        paymentReceipts[
                          resource.id
                        ] && (
                          <div className="resources-inline-receipt">

                            <button
                              type="button"
                              className="resources-receipt-toggle"
                              onClick={() =>
                                setOpenReceiptId(
                                  openReceiptId ===
                                    resource.id
                                    ? null
                                    : resource.id
                                )
                              }
                            >
                              {openReceiptId ===
                              resource.id
                                ? "Hide payment receipt"
                                : "View payment receipt"}
                            </button>

                            {openReceiptId ===
                              resource.id && (
                              <div className="resources-payment-receipt">

                                <div className="resources-payment-receipt-header">
                                  <div>
                                    <span>
                                      PAYMENT SUCCESSFUL
                                    </span>

                                    <h2>
                                      Payment Receipt
                                    </h2>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenReceiptId(
                                        null
                                      )
                                    }
                                    aria-label="Close payment receipt"
                                  >
                                    ×
                                  </button>
                                </div>

                                <div className="resources-payment-receipt-status">
                                  <strong>
                                    ✓{" "}
                                    {paymentReceipts[
                                      resource.id
                                    ].status ||
                                      "Paid"}
                                  </strong>

                                  <span>
                                    {paymentReceipts[
                                      resource.id
                                    ].paid_at
                                      ? new Date(
                                          paymentReceipts[
                                            resource.id
                                          ].paid_at
                                        ).toLocaleString()
                                      : "Payment completed"}
                                  </span>
                                </div>

                                <div className="resources-payment-receipt-grid">

                                  <div>
                                    <small>
                                      Amount
                                    </small>

                                    <strong>
                                      ₹
                                      {Number(
                                        paymentReceipts[
                                          resource.id
                                        ].amount ||
                                          0
                                      ).toFixed(2)}
                                    </strong>
                                  </div>

                                  <div>
                                    <small>
                                      Resource
                                    </small>

                                    <strong>
                                      {paymentReceipts[
                                        resource.id
                                      ].item_title ||
                                        resource.title}
                                    </strong>
                                  </div>

                                  <div>
                                    <small>
                                      Location
                                    </small>

                                    <strong>
                                      {paymentReceipts[
                                        resource.id
                                      ].location ||
                                        resource.location ||
                                        "Campus"}
                                    </strong>
                                  </div>

                                  <div>
                                    <small>
                                      Payment Method
                                    </small>

                                    <strong>
                                      {paymentReceipts[
                                        resource.id
                                      ].payment_method ||
                                        "Razorpay"}
                                    </strong>
                                  </div>

                                  <div>
                                    <small>
                                      Transaction ID
                                    </small>

                                    <strong>
                                      {paymentReceipts[
                                        resource.id
                                      ].transaction_id ||
                                        "Not available"}
                                    </strong>
                                  </div>

                                  <div>
                                    <small>
                                      Payer Mobile
                                    </small>

                                    <strong>
                                      {paymentReceipts[
                                        resource.id
                                      ].payer
                                        ?.mobile ||
                                        "Not available"}
                                    </strong>
                                  </div>

                                  <div>
                                    <small>
                                      Payer UPI
                                    </small>

                                    <strong>
                                      {paymentReceipts[
                                        resource.id
                                      ].payer
                                        ?.upi_id ||
                                        "Not available"}
                                    </strong>
                                  </div>

                                  <div>
                                    <small>
                                      Receiver
                                    </small>

                                    <strong>
                                      {paymentReceipts[
                                        resource.id
                                      ].receiver
                                        ?.name ||
                                        "Not available"}
                                    </strong>
                                  </div>

                                  <div>
                                    <small>
                                      Receiver Mobile
                                    </small>

                                    <strong>
                                      {paymentReceipts[
                                        resource.id
                                      ].receiver
                                        ?.mobile ||
                                        "Not available"}
                                    </strong>
                                  </div>

                                  <div>
                                    <small>
                                      Receiver UPI
                                    </small>

                                    <strong>
                                      {paymentReceipts[
                                        resource.id
                                      ].receiver
                                        ?.upi_id ||
                                        "Not available"}
                                    </strong>
                                  </div>

                                </div>
                              </div>
                            )}
                          </div>
                        )}
                    </article>
                  );
                }
              )}
            </section>
          )}
        </main>
      </div>

      <BottomNavigation active="resources" />
    </div>
  );
}

export default Resources;