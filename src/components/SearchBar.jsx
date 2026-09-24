import { Search } from "lucide-react";
import "./SearchBar.css";

function SearchBar({ placeholder = "Search...", value, onChange }) {
  return (
    <div className="search-bar">

      <Search size={18} />

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="text"
        placeholder={placeholder}
      />

    </div>
  );
}

export default SearchBar;
