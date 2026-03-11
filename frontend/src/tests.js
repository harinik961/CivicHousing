import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import NavBar from './components/Navbar';
import Communities from './pages/Communities/Community';
import Housing from './pages/Housing/Housing';
import Transportation from './pages/Transportation/Transportation';
import CommunityInstance from './pages/Communities/Community-Instance';
import HousingInstance from './pages/Housing/HousingInstance';
import TransportationInstance from './pages/Transportation/Transport-Instance';
import About from './pages/About';
import Home from './pages/home';

// Render pages
jest.mock('./pages/Communities/Community', () => {
  return function DummyCommunity() {
    return <div>Community</div>;
  };
});
jest.mock('./pages/Housing/Housing', () => {
  return function DummyHousing() {
    return <div>Housing</div>;
  };
});
jest.mock('./pages/Transportation/Transportation', () => {
  return function DummyTransportation() {
    return <div>Transportation</div>;
  };
});
jest.mock('./pages/Communities/Community-Instance', () => {
  return function DummyCommunityInstance() {
    return <div>Community</div>;
  };
});
jest.mock('./pages/Housing/HousingInstance', () => {
  return function DummyHousingInstance() {
    return <div>Housing</div>;
  };
});
jest.mock('./pages/Transportation/Transport-Instance', () => {
  return function DummyTransportationInstance() {
    return <div>Transportation</div>;
  };
});

// Test #1
test('NavBar renders the logo', () => {
  render(<MemoryRouter><NavBar /></MemoryRouter>);
  expect(screen.getByAltText('CivicHousing')).toBeInTheDocument();
});

// Test #2
test('NavBar logo links to home', () => {
  render(<MemoryRouter><NavBar /></MemoryRouter>);
  expect(screen.getByAltText('CivicHousing').closest('a')).toHaveAttribute('href', '/');
});

// Test #3
test('NavBar renders all links', () => {
  render(<MemoryRouter><NavBar /></MemoryRouter>);
  const links = screen.getAllByRole('link');
  expect(links.some(link => /home/i.test(link.textContent))).toBe(true);
  expect(links.some(link => /communities/i.test(link.textContent))).toBe(true);
  expect(links.some(link => /housing/i.test(link.textContent))).toBe(true);
  expect(links.some(link => /transportation/i.test(link.textContent))).toBe(true);
  expect(links.some(link => /about/i.test(link.textContent))).toBe(true);
});

// Test #4
test('NavBar links point to correct routes', () => {
  render(<MemoryRouter><NavBar /></MemoryRouter>);
  const links = screen.getAllByRole('link');
  expect(links.find(link => /home/i.test(link.textContent))).toHaveAttribute('href', '/');
  expect(links.find(link => /communities/i.test(link.textContent))).toHaveAttribute('href', '/community');
  expect(links.find(link => /housing/i.test(link.textContent))).toHaveAttribute('href', '/housing');
  expect(links.find(link => /transportation/i.test(link.textContent))).toHaveAttribute('href', '/transportation');
  expect(links.find(link => /about/i.test(link.textContent))).toHaveAttribute('href', '/about');
});

// Test #5
test('Community page renders', async () => {
  render(<MemoryRouter><Communities /></MemoryRouter>);
  expect(await screen.findByText(/community/i)).toBeInTheDocument();
});

// Test #6
test('Housing page renders', async () => {
  render(<MemoryRouter><Housing /></MemoryRouter>);
  expect(await screen.findByText(/housing/i)).toBeInTheDocument();
});

// Test #7
test('Transportation page renders', async () => {
  render(<MemoryRouter><Transportation /></MemoryRouter>);
  expect(await screen.findByText(/transportation/i)).toBeInTheDocument();
});

// Test #8
test('CommunityInstance page renders', async () => {
  render(<MemoryRouter><CommunityInstance /></MemoryRouter>);
  expect(await screen.findByText(/community/i)).toBeInTheDocument();
});

// Test #9
test('HousingInstance page renders', async () => {
  render(<MemoryRouter><HousingInstance /></MemoryRouter>);
  expect(await screen.findByText(/housing/i)).toBeInTheDocument();
});

// Test #10
test('TransportationInstance page renders', async () => {
  render(<MemoryRouter><TransportationInstance /></MemoryRouter>);
  expect(await screen.findByText(/transportation/i)).toBeInTheDocument();
});

// Test #11
test('About page renders', async () => {
  render(<MemoryRouter><About /></MemoryRouter>);
  expect(await screen.findByText(/About CivicHousing/)).toBeInTheDocument();
});

// Test #12
test('Home page renders', async () => {
  render(<MemoryRouter><Home /></MemoryRouter>);
  expect(await screen.findByText(/Welcome to Civic Housing/)).toBeInTheDocument();
});