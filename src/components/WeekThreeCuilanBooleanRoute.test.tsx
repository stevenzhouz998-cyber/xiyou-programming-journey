import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeekThreeCuilanBooleanRouteBoundary } from './MissionPageContent';
describe('W3-M2 lazy route', () => {
  it('loads the formal route boundary without legacy tools', async () => {
    render(<WeekThreeCuilanBooleanRouteBoundary reducedMotion muted onComplete={() => true} loader={async () => ({ default: () => <p>formal-cuilan</p> })} />);
    expect(await screen.findByText('formal-cuilan')).toBeInTheDocument();
  });
});
