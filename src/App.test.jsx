import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import App from './App';
import * as api from './utils/api';

// Mock the API module
vi.mock('./utils/api', () => ({
  checkServerHealth: vi.fn(),
}));

// Mock the Routes component since we just want to test App's button
vi.mock('./Routes', () => ({
  default: () => <div data-testid="routes-mock">Routes Mock</div>,
}));

describe('App', () => {
  it('renders the Wake Up Backend button', () => {
    render(<App />);
    expect(screen.getByText('Wake Up Backend')).toBeInTheDocument();
    expect(screen.getByTestId('routes-mock')).toBeInTheDocument();
  });

  it('calls checkServerHealth and updates button text when clicked (success)', async () => {
    api.checkServerHealth.mockResolvedValueOnce({ status: 'ok' });
    
    render(<App />);
    const button = screen.getByText('Wake Up Backend');
    
    fireEvent.click(button);
    
    expect(screen.getByText('Waking...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Backend Awake!')).toBeInTheDocument();
    });
  });

  it('calls checkServerHealth and updates button text when clicked (failure)', async () => {
    api.checkServerHealth.mockResolvedValueOnce(false);
    
    render(<App />);
    const button = screen.getByText('Wake Up Backend');
    
    fireEvent.click(button);
    
    expect(screen.getByText('Waking...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Wake Failed')).toBeInTheDocument();
    });
  });
});
