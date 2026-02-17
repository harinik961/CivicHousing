import { Navbar as BSNavbar, Nav, Container } from 'react-bootstrap';
import "./Navbar.css";

export default function NavBar() {
  return (
    <BSNavbar expand="lg" variant="dark" className="navbar">
      <Container fluid className="px-0 px-lg-4">
        <BSNavbar.Brand className="logo" href="/">
          CivicHousing
        </BSNavbar.Brand>

        <BSNavbar.Toggle aria-controls="navbar-toggle"/>
          <BSNavbar.Collapse id="navbar-toggle">
            <Nav className="ms-auto nav-links">
              <Nav.Link href="/">Home</Nav.Link>
              <Nav.Link href="/community">Communities</Nav.Link>
              <Nav.Link href="/housing">Housing</Nav.Link>
              <Nav.Link href="/transportation">Transportation</Nav.Link>
              <Nav.Link href="/about">About</Nav.Link>
            </Nav>
          </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
}
