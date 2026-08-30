import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeekFourMappingRouteBoundary } from './MissionPageContent';

describe('W4-M1 dedicated lazy route', () => {
  it('loads the formal experience without legacy mission tools', async () => {
    render(<WeekFourMappingRouteBoundary reducedMotion muted onComplete={() => true} loader={async () => ({ default: () => <p>formal-w4</p> })} />);
    expect(await screen.findByText('formal-w4')).toBeInTheDocument();
  });
});
