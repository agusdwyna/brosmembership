import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../Badge';

describe('StatusBadge', () => {
  it('renders ACTIVE status with success variant', () => {
    render(<StatusBadge status="ACTIVE" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders EXPIRED status', () => {
    render(<StatusBadge status="EXPIRED" />);
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('renders REVOKED status', () => {
    render(<StatusBadge status="REVOKED" />);
    expect(screen.getByText('Revoked')).toBeInTheDocument();
  });

  it('renders SUSPENDED status', () => {
    render(<StatusBadge status="SUSPENDED" />);
    expect(screen.getByText('Suspended')).toBeInTheDocument();
  });

  it('renders CANCELLED status', () => {
    render(<StatusBadge status="CANCELLED" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('renders VALID status', () => {
    render(<StatusBadge status="VALID" />);
    expect(screen.getByText('Valid')).toBeInTheDocument();
  });

  it('renders NOT_FOUND status', () => {
    render(<StatusBadge status="NOT_FOUND" />);
    expect(screen.getByText('Not Found')).toBeInTheDocument();
  });

  it('renders unknown status as-is', () => {
    render(<StatusBadge status="CUSTOM" />);
    expect(screen.getByText('CUSTOM')).toBeInTheDocument();
  });
});
