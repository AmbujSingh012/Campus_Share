import { ChevronDown } from "lucide-react";

import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";
import SearchBar from "../components/SearchBar";
import ResourceCard from "../components/ResourceCard";

function Resources() {
  const resources = [
    {
      name: "Scientific Calculator",
      category: "Electronics",
      owner: "Rahul",
      rating: "4.8",
    },
    {
      name: "USB-C Charger",
      category: "Electronics",
      owner: "Priya",
      rating: "4.6",
    },
    {
      name: "Operating System Notes",
      category: "Study Materials",
      owner: "Aman",
      rating: "4.9",
    },
    {
      name: "Engineering Drawing Kit",
      category: "Study Materials",
      owner: "Neha",
      rating: "4.7",
    },
    {
      name: "Football",
      category: "Sports",
      owner: "Arjun",
      rating: "4.5",
    },
  ];

  return (
    <div className="page">
      <Header title="Resources" showBack />

      <main className="page-content">
        <SearchBar placeholder="Search resources..." />

        <div className="category-filter">
          <button className="category-pill active">
            All
          </button>

          <button className="category-pill">
            Books
          </button>

          <button className="category-pill">
            Electronics
          </button>

          <button className="category-pill">
            Sports
          </button>
        </div>

        <div className="sort-row">
          <span>Resources</span>

          <button className="sort-button">
            Recommended
            <ChevronDown size={15} />
          </button>
        </div>

        <div className="resource-list">
          {resources.map((resource, index) => (
            <ResourceCard
              key={index}
              name={resource.name}
              category={resource.category}
              owner={resource.owner}
              rating={resource.rating}
            />
          ))}
        </div>
      </main>

      <BottomNavigation active="resources" />
    </div>
  );
}

export default Resources;