import { Navbar as BSNavbar, Nav, Container } from 'react-bootstrap';
import { Link } from "react-router-dom"
import "./Navbar.css";
import logo from "../logo.svg"

export default function NavBar() {
  return (
    <BSNavbar expand="lg" variant="dark" className="navbar">
      <Container fluid className="px-0 px-lg-4">
        <BSNavbar.Brand className="logo" as={Link} to="/">
          <img src={logo} alt="CivicHousing" className="logo-icon"></img>
        </BSNavbar.Brand>

        <BSNavbar.Toggle aria-controls="navbar-toggle"/>
          <BSNavbar.Collapse id="navbar-toggle">
            <Nav className="ms-auto nav-links">
              <Nav.Link as={Link} to="/">Home</Nav.Link>
              <Nav.Link as={Link} to="/community">Communities</Nav.Link>
              <Nav.Link as={Link} to="/housing">Housing</Nav.Link>
              <Nav.Link as={Link} to="/transportation">Transportation</Nav.Link>
              <Nav.Link as={Link} to="/visualizations">Visualizations</Nav.Link>
              <Nav.Link as={Link} to="/provider-visualizations">Provider Visualizations</Nav.Link>
              <Nav.Link as={Link} to="/globalsearch">Search</Nav.Link>
              <Nav.Link as={Link} to="/about">About</Nav.Link>
              <Nav.Link as={Link} to="/nl-query">Ask Data</Nav.Link>
            </Nav>
          </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
}
