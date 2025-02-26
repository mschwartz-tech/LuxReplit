import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import ExerciseLibrary from '../pages/exercise-library';
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock the fetch function
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock API responses
const mockAIResponse = {
  description: "A compound leg exercise",
  difficulty: "intermediate",
  primaryMuscleGroupId: 1,
  secondaryMuscleGroupIds: [2, 13],
  instructions: [
    "Stand with feet shoulder-width apart",
    "Lower your body by bending knees",
    "Return to starting position"
  ],
  videoUrl: "https://example.com/video"
};

describe('Exercise Form', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    mockFetch.mockClear();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ExerciseLibrary />
      </QueryClientProvider>
    );
  };

  test('opens form dialog when add exercise button is clicked', async () => {
    renderComponent();
    const addButton = screen.getByText(/Add Exercise/i);
    await userEvent.click(addButton);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('handles successful AI prediction', async () => {
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockAIResponse)
    }));

    renderComponent();
    const addButton = screen.getByText(/Add Exercise/i);
    await userEvent.click(addButton);

    const nameInput = screen.getByPlaceholderText(/e.g. Barbell Back Squat/i);
    await userEvent.type(nameInput, 'Barbell Squat');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/AI analysis complete/i)).toBeInTheDocument();
    });
  });

  test('handles API error gracefully', async () => {
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve('Server Error')
    }));

    renderComponent();
    const addButton = screen.getByText(/Add Exercise/i);
    await userEvent.click(addButton);

    const nameInput = screen.getByPlaceholderText(/e.g. Barbell Back Squat/i);
    await userEvent.type(nameInput, 'Barbell Squat');

    await waitFor(() => {
      expect(screen.getByText(/Failed to analyze exercise/i)).toBeInTheDocument();
    });
  });

  test('validates form inputs before submission', async () => {
    renderComponent();
    const addButton = screen.getByText(/Add Exercise/i);
    await userEvent.click(addButton);

    const submitButton = screen.getByText(/Create Exercise/i);
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
    });
  });

  test('prevents submission with invalid data', async () => {
    renderComponent();
    const addButton = screen.getByText(/Add Exercise/i);
    await userEvent.click(addButton);

    const nameInput = screen.getByPlaceholderText(/e.g. Barbell Back Squat/i);
    await userEvent.type(nameInput, 'a'); // Too short

    const submitButton = screen.getByText(/Create Exercise/i);
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Name must be at least/i)).toBeInTheDocument();
    });
  });
});