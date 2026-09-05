import { Search } from "lucide-react";

function SearchBar({ placeholder = "Search..." }) {
  return (
    <div className="search-bar">

      <Search size={18} />

      <input
        type="text"
        placeholder={placeholder}
      />

    </div>
  );
}

export default SearchBar;
