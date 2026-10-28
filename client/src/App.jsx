import FoodCard from "./components/FoodCard";

const foodItems = [
  { id: 1, name: "Veg Burger", price: 60, isVeg: true, category: "Snacks" },
  { id: 2, name: "Masala Dosa", price: 50, isVeg: true, category: "Breakfast" },
  { id: 3, name: "Chicken Biryani", price: 120, isVeg: false, category: "Meals" },
  { id: 4, name: "Cold Coffee", price: 40, isVeg: true, category: "Drinks" },
];

function App() {
  return (
    <div className="page">
      <h1>Campus 360</h1>
      <h2>Smart Canteen</h2>
      <p>Order your food online and skip the queue.</p>

      <div className="food-grid">
        {foodItems.map((item) => (
          <FoodCard
            key={item.id}
            name={item.name}
            price={item.price}
            isVeg={item.isVeg}
            category={item.category}
          />
        ))}
      </div>
    </div>
  );
}

export default App;