import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from '../DataTable';

interface TestRow {
  id: string;
  name: string;
  status: string;
}

const columns = [
  {
    key: 'name',
    header: 'Name',
    render: (row: TestRow) => <span>{row.name}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row: TestRow) => <span>{row.status}</span>,
  },
];

const data: TestRow[] = [
  { id: '1', name: 'Alice', status: 'Active' },
  { id: '2', name: 'Bob', status: 'Inactive' },
  { id: '3', name: 'Charlie', status: 'Active' },
];

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable<TestRow> columns={columns} data={data} getRowId={(r) => r.id} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders data rows', () => {
    render(<DataTable<TestRow> columns={columns} data={data} getRowId={(r) => r.id} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('shows empty state when data is empty', () => {
    render(
      <DataTable<TestRow>
        columns={columns}
        data={[]}
        emptyTitle="No items"
        emptyDescription="Create one"
        getRowId={(r) => r.id}
      />,
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Create one')).toBeInTheDocument();
  });

  it('shows loading skeleton', () => {
    const { container } = render(
      <DataTable<TestRow> columns={columns} data={[]} loading getRowId={(r) => r.id} />,
    );
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('calls onRowClick when row is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <DataTable<TestRow>
        columns={columns}
        data={data}
        onRowClick={handleClick}
        getRowId={(r) => r.id}
      />,
    );

    await user.click(screen.getByText('Alice'));
    expect(handleClick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Alice' }));
  });

  it('paginates data', () => {
    const manyItems: TestRow[] = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      name: `User ${i}`,
      status: 'Active',
    }));

    render(
      <DataTable<TestRow>
        columns={columns}
        data={manyItems}
        pageSize={10}
        getRowId={(r) => r.id}
      />,
    );

    expect(screen.getByText('User 0')).toBeInTheDocument();
    expect(screen.queryByText('User 10')).not.toBeInTheDocument();
  });
});
