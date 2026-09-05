import { ImagePlus } from "lucide-react";

import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";

function PostResource() {
  return (
    <div className="page">
      <Header title="Post Resource" showBack />

      <main className="page-content">
        <p className="form-description">
          Share an item with students on your campus
        </p>

        <div className="upload-box">
          <ImagePlus size={30} />

          <h3>Upload Resource Image</h3>

          <p>PNG, JPG up to 5MB</p>
        </div>

        <form className="resource-form">
          <div className="form-group">
            <label className="form-label">
              Resource Name
            </label>

            <input
              className="form-input"
              type="text"
              placeholder="Enter resource name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Category
            </label>

            <select className="form-input">
              <option>Select category</option>
              <option>Books</option>
              <option>Electronics</option>
              <option>Sports</option>
              <option>Clothing</option>
              <option>Study Materials</option>
              <option>Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Description
            </label>

            <textarea
              className="form-input textarea"
              placeholder="Describe your resource"
              rows="4"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Condition
            </label>

            <div className="condition-options">
              <button type="button" className="condition-button active">
                Excellent
              </button>

              <button type="button" className="condition-button">
                Good
              </button>

              <button type="button" className="condition-button">
                Fair
              </button>

              <button type="button" className="condition-button">
                Needs Repair
              </button>
            </div>
          </div>

          <div className="availability-row">
            <div>
              <label className="form-label">
                Availability
              </label>

              <p>Allow students to borrow this resource</p>
            </div>

            <input type="checkbox" defaultChecked />
          </div>

          <div className="form-group">
            <label className="form-label">
              Borrowing Fee
            </label>

            <input
              className="form-input"
              type="text"
              placeholder="0.10 USDC"
            />

            <p className="input-helper">
              Leave as 0 if you want to lend it for free.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">
              Pickup Location
            </label>

            <input
              className="form-input"
              type="text"
              placeholder="Library Block A"
            />
          </div>

          <button
            type="button"
            className="primary-button"
          >
            Post Resource
          </button>
        </form>
      </main>

      <BottomNavigation active="post" />
    </div>
  );
}

export default PostResource;