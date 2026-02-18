import React from "react";
import { Link } from "react-router-dom";
import { Carousel, Card, Button, Container, Row, Col } from "react-bootstrap";
import "./home.css";

export default function Home() {
  return (
    <div className="home-container">

      {/* Hero Carousel */}
      <Carousel className="hero-carousel">
        <Carousel.Item>
          <div className="carousel-slide slide-1">
            <div className="carousel-overlay">
              <h1>Find Affordable Housing in Austin</h1>
              <p>Explore housing options that fit your budget and lifestyle.</p>
              <Link to="/housing"><Button variant="light">Browse Housing</Button></Link>
            </div>
          </div>
        </Carousel.Item>
        <Carousel.Item>
          <div className="carousel-slide slide-2">
            <div className="carousel-overlay">
              <h1>Discover Your Community</h1>
              <p>Learn about neighborhoods across Austin, safety, transit, and more.</p>
              <Link to="/community"><Button variant="light">Explore Communities</Button></Link>
            </div>
          </div>
        </Carousel.Item>
        <Carousel.Item>
          <div className="carousel-slide slide-3">
            <div className="carousel-overlay">
              <h1>Navigate Austin Transit</h1>
              <p>Find bus and train stops near affordable housing options.</p>
              <Link to="/transportation"><Button variant="light">View Transportation</Button></Link>
            </div>
          </div>
        </Carousel.Item>
      </Carousel>

      {/* Intro Blurb */}
      <Container className="intro-section text-center">
        <h2>What is CivicHousing?</h2>
        <p>
          CivicHousing is a data-driven platform highlighting affordable housing availability
          and transportation accessibility gaps across Austin, Texas. We help residents,
          planners, and policymakers identify where affordability and mobility intersect or fail to.
        </p>
      </Container>

      {/* Model Cards */}
      <Container className="cards-section">
        <Row className="justify-content-center">
          <Col md={4}>
            <Card className="model-card">
              <Card.Body>
                <Card.Title>Communities</Card.Title>
                <Card.Text>
                  Explore Austin neighborhoods by median housing prices, crime index, population, and transit scores.
                </Card.Text>
                <Link to="/community"><Button className="custom-btn">View Communities</Button></Link>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="model-card">
              <Card.Body>
                <Card.Title>Housing</Card.Title>
                <Card.Text>
                  Browse affordable housing units including apartments and rentals with accessibility and cost info.
                </Card.Text>
                <Link to="/housing"><Button className="custom-btn">View Housing</Button></Link>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="model-card">
              <Card.Body>
                <Card.Title>Transportation</Card.Title>
                <Card.Text>
                  Find bus and train stops near you with walkability scores and sidewalk accessibility data.
                </Card.Text>
                <Link to="/transportation"><Button className="custom-btn">View Transportation</Button></Link>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* 3 Key Questions */}
      <Container className="questions-section text-center">
        <h2>Questions We Help Answer</h2>
        <Row className="justify-content-center">
          <Col md={4}>
            <div className="question-box">
              <h5>Where can I find affordable housing in Austin?</h5>
            </div>
          </Col>
          <Col md={4}>
            <div className="question-box">
              <h5>Is the path between my apartment and the bus stop safe and accessible?</h5>
            </div>
          </Col>
          <Col md={4}>
            <div className="question-box">
              <h5>What affordable housing is closest to reliable transit options?</h5>
            </div>
          </Col>
        </Row>
      </Container>

    </div>
  );
}