let users = [
  {
    id: 1,
    name: "Aman",
    email: "aman@example.com",
    password: "123456",
    wallet_address: "TEST_WALLET_001",
  },
];

let resources = [
  {
    id: 1,
    title: "Engineering Calculator",
    description: "Casio calculator available for borrowing",
    category: "Electronics",
    postedBy: 1,
    location: "Library",
  },
  {
    id: 2,
    title: "DBMS Notes",
    description: "Complete DBMS handwritten notes",
    category: "Study",
    postedBy: 1,
    location: "Hostel",
  },
];

let tasks = [
  {
    id: 1,
    title: "Print OS Notes",
    description: "Need someone to print OS notes",
    category: "Study",
    reward: "0.10 USDC",
    deadline: "Today, 6 PM",
    location: "Library",
    postedBy: 1,
    status: "open",
  },
  {
    id: 2,
    title: "Deliver Lab Coat",
    description: "Please deliver my lab coat",
    category: "Delivery",
    reward: "0.20 USDC",
    deadline: "Tomorrow",
    location: "Block A",
    postedBy: 1,
    status: "open",
  },
];

let acceptances = [];

module.exports = {
  users,
  resources,
  tasks,
  acceptances,
};