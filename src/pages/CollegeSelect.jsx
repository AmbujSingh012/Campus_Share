import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  LoaderCircle,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../api";
import "./CollegeSelect.css";

function CollegeSelect() {
  const navigate = useNavigate();

  const [colleges, setColleges] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const loadColleges = async (searchText = "", pageNumber = 1) => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(pageNumber),
        limit: "20",
      });

      if (searchText.trim()) {
        params.set("search", searchText.trim());
      }

      const response = await fetch(
        `${API_BASE_URL}/api/colleges?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load colleges");
      }

      setColleges(data.colleges || []);
      setPagination(data.pagination || {});
    } catch (err) {
      console.error("College loading error:", err);
      setError("Unable to load colleges. Please try again.");
      setColleges([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadColleges();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadColleges(search, 1);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  const filteredColleges = useMemo(() => {
    return colleges;
  }, [colleges]);

  const handleSelectCollege = (college) => {
    localStorage.setItem("selectedCollege", JSON.stringify(college));
    navigate("/login");
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || loading) {
      return;
    }

    loadColleges(search, newPage);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const getInitials = (name = "") => {
    const words = name
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .split(" ")
      .filter(Boolean);

    if (words.length === 0) return "C";

    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }

    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  };

  return (
    <div className="college-page app-page-frame">
      <div className="college-container">

        <div className="college-hero">
          <div className="college-badge">
            <Sparkles size={16} />
            CampusShare
          </div>

          <h1>
            Choose your
            <span> campus</span>
          </h1>

          <p>
            Select your college to discover resources, tasks and students
            across your campus network.
          </p>
        </div>

        <div className="college-search-wrapper">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search college, city, state or AISHE code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading && (
            <LoaderCircle
              size={20}
              className="college-search-loader"
            />
          )}
        </div>

        <div className="college-result-header">
          <div>
            <span className="college-result-title">
              {search.trim() ? "Search results" : "Colleges & universities"}
            </span>

            {!loading && (
              <span className="college-result-count">
                {pagination.total || 0} institutions
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="college-error">
            <p>{error}</p>

            <button onClick={() => loadColleges(search)}>
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="college-loading">
            <LoaderCircle size={32} className="college-spinner" />
            <p>Loading institutions...</p>
          </div>
        ) : filteredColleges.length === 0 ? (
          <div className="college-empty">
            <Building2 size={42} />
            <h3>No institution found</h3>
            <p>
              Try searching with a different college name, city or AISHE code.
            </p>
          </div>
        ) : (
          <div className="college-grid">
            {filteredColleges.map((college) => (
              <button
                key={college.id}
                className="college-card"
                onClick={() => handleSelectCollege(college)}
              >
                <div className="college-card-icon">
                  {getInitials(college.name)}
                </div>

                <div className="college-card-content">
                  <h3>{college.name}</h3>

                  <div className="college-location">
                    <MapPin size={14} />

                    <span>
                      {[college.city, college.state]
                        .filter(Boolean)
                        .join(", ") || "Location unavailable"}
                    </span>
                  </div>

                  <div className="college-meta">
                    <span>
                      {college.institution_type === "university"
                        ? "University"
                        : "College"}
                    </span>

                    {college.aishe_code && (
                      <span>{college.aishe_code}</span>
                    )}
                  </div>
                </div>

                <ArrowRight
                  size={19}
                  className="college-card-arrow"
                />
              </button>
            ))}
          </div>
        )}

        {!loading && pagination.totalPages > 1 && (
          <div className="college-pagination">
            <button
              type="button"
              className="college-page-button"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              ← Previous
            </button>

            <button
              type="button"
              className="college-page-button college-page-button-primary"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CollegeSelect;
