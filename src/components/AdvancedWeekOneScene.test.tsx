import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { runAdvancedWeekOne } from '../battle/advancedWeekOne'
import { assetUrl } from '../utils/assets'
import { AdvancedWeekOneScene } from './AdvancedWeekOneScene'

describe('AdvancedWeekOneScene', () => {
  it('uses only the approved underworld raster slots and derives its visible state from run events', () => {
    const events = runAdvancedWeekOne('w1-m4', [{ instructionId: 'instruction:open', sourceBlockId: 'open', parentBlockId: null, opcode: 'underworld_open_register' }]).events
    render(<AdvancedWeekOneScene missionId="w1-m4" events={events} replayToken={1} reducedMotion muted />)
    expect(screen.getByRole('img', { name: '幽冥勾名代码执行场景' })).toHaveAttribute('data-scene-state', 'underworld-opened')
    expect(screen.getByRole('img', { name: '幽冥勾名代码执行场景' })).toHaveAttribute('data-background-src', '/assets/week-one-advanced/underworld-background.webp')
    expect(screen.getByAltText('幽冥名册状态')).toHaveAttribute('src', assetUrl('/assets/week-one-advanced/register-states.webp'))
    expect(screen.getByRole('status')).toHaveTextContent('已打开名册')
    expect(screen.getByRole('status')).not.toHaveTextContent('underworld-opened')
  })

  it('clips the mission sprite sheet to the current state and blocks playback until both approved images load', async () => {
    const complete = vi.fn()
    const { rerender } = render(<AdvancedWeekOneScene missionId="w1-m4" events={[]} replayToken={1} reducedMotion muted onPlaybackComplete={complete} />)
    const scene = screen.getByRole('img', { name: '幽冥勾名代码执行场景' })
    expect(scene).toHaveAttribute('data-scene-ready', 'false')
    expect(screen.getByAltText('幽冥名册状态')).toHaveAttribute('data-sprite-stage', '0')
    fireEvent.load(screen.getByAltText('幽冥文书房背景'))
    fireEvent.load(screen.getByAltText('幽冥名册状态'))
    expect(scene).toHaveAttribute('data-scene-ready', 'true')
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1))

    const advanced = runAdvancedWeekOne('w1-m4', [{ instructionId: 'instruction:open', sourceBlockId: 'open', parentBlockId: null, opcode: 'underworld_open_register' }]).events
    rerender(<AdvancedWeekOneScene missionId="w1-m4" events={advanced} replayToken={2} reducedMotion muted onPlaybackComplete={complete} />)
    expect(screen.getByAltText('幽冥名册状态')).toHaveAttribute('data-sprite-stage', '1')
  })

  it('shows a visible retry after an image failure and never completes that failed playback', () => {
    const complete = vi.fn()
    render(<AdvancedWeekOneScene missionId="w1-m5" events={[]} replayToken={1} reducedMotion muted onPlaybackComplete={complete} />)
    fireEvent.error(screen.getByAltText('第三回行程图'))
    expect(screen.getByRole('alert')).toHaveTextContent('场景图片没有加载成功')
    expect(complete).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '重试加载场景图片' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '重试加载场景图片' }))
    expect(screen.getByAltText('第三回行程图')).toHaveAttribute('srcset', expect.stringContaining('?retry=1'))
    expect(screen.getByAltText('第三回检查点状态')).toHaveAttribute('srcset', expect.stringContaining('?retry=1'))
  })
})
