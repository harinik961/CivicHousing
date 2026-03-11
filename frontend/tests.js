import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NavBar from '../Navbar';
import Transportation from '../Transportation'
import Community from '../Community'
import HousingInstance from '../HousingInstance'


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
  expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /communities/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /housing/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /transportation/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument();
});

// Test #4
test('NavBar links point to correct routes', () => {
  render(<MemoryRouter><NavBar /></MemoryRouter>);
  expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: /communities/i })).toHaveAttribute('href', '/community');
  expect(screen.getByRole('link', { name: /housing/i })).toHaveAttribute('href', '/housing');
  expect(screen.getByRole('link', { name: /transportation/i })).toHaveAttribute('href', '/transportation');
  expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '/about');
});

// Test #5