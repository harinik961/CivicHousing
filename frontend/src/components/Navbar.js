import { Link } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">CivicHousing</div>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/community">Communities</Link>
        <Link to="/housing">Housing</Link>
        <Link to="/transportation">Transportation</Link>
      </div>
    </nav>
  );
}
