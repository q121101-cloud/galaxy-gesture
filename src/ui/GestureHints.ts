import { GestureState } from '../core/types';

export type HintType = 'open-fist' | 'tilt' | 'pinch' | 'swipe';

export interface GestureHintsConfig {
  containerId?: string;
  autoFadeDelayMs?: number;
}

/**
 * GestureHints
 * Contextual floating gesture guide cards that dynamically highlight
 * the active gesture being performed, provide scene-specific interaction tips,
 * and gently fade when user is confidently controlling the universe.
 */
export class GestureHints {
  private container: HTMLElement | null = null;
  private hintCards: Map<HintType, HTMLElement> = new Map();
  private activeHint: HintType | null = null;
  private isVisible: boolean = true;
  private autoFadeTimer: number | null = null;
  private autoFadeDelayMs: number;

  constructor(config: GestureHintsConfig = {}) {
    this.autoFadeDelayMs = config.autoFadeDelayMs ?? 8000;
    const containerId = config.containerId ?? 'gesture-hints-container';

    if (typeof document !== 'undefined') {
      this.container = document.getElementById(containerId);

      const openFistCard = document.getElementById('hint-open-fist');
      const tiltCard = document.getElementById('hint-tilt');
      const pinchCard = document.getElementById('hint-pinch');
      const swipeCard = document.getElementById('hint-swipe');

      if (openFistCard) this.hintCards.set('open-fist', openFistCard);
      if (tiltCard) this.hintCards.set('tilt', tiltCard);
      if (pinchCard) this.hintCards.set('pinch', pinchCard);
      if (swipeCard) this.hintCards.set('swipe', swipeCard);
    }
  }

  /**
   * Dynamically evaluate current gesture state and highlight corresponding hint card
   */
  public updateGesture(state: GestureState): void {
    if (!state.hasHand) {
      this.clearHighlight();
      return;
    }

    // Determine dominant gesture
    if (state.swipeTriggered) {
      this.highlightHint('swipe');
    } else if (state.pinchDistance < 0.3 || state.timeDilation < 0.5) {
      this.highlightHint('pinch');
    } else if (Math.abs(state.rotation.pitch) > 0.25 || Math.abs(state.rotation.roll) > 0.25) {
      this.highlightHint('tilt');
    } else if (state.openness < 0.25 || state.openness > 0.75) {
      this.highlightHint('open-fist');
    } else {
      this.clearHighlight();
    }
  }

  /**
   * Highlight a specific hint card
   */
  public highlightHint(hintType: HintType): void {
    if (this.activeHint === hintType) return;
    this.activeHint = hintType;

    this.hintCards.forEach((card, type) => {
      card.classList.toggle('active', type === hintType);
    });
  }

  /**
   * Clear active card highlight
   */
  public clearHighlight(): void {
    if (this.activeHint === null) return;
    this.activeHint = null;

    this.hintCards.forEach((card) => {
      card.classList.remove('active');
    });
  }

  /**
   * Update hint labels contextually when switching between scenes
   */
  public setScene(sceneName: string): void {
    const openFistCard = this.hintCards.get('open-fist');
    if (!openFistCard) return;

    let tipText = '<b>Clench / Open</b>: Zoom / Singularity';
    switch (sceneName.toLowerCase()) {
      case 'gargantua':
        tipText = '<b>Clench / Open</b>: Accretion Singularity';
        break;
      case 'wormhole':
        tipText = '<b>Clench / Open</b>: Throat Warp Speed';
        break;
      case 'tesseract':
        tipText = '<b>Clench / Open</b>: 5D Lattice Projection';
        break;
    }

    const textSpan = openFistCard.querySelector?.('.hint-text');
    if (textSpan) {
      textSpan.innerHTML = tipText;
      textSpan.textContent = tipText.replace(/<[^>]*>/g, '');
    }
    openFistCard.innerHTML = `<span class="hint-icon">✊ / 🖐️</span><span class="hint-text">${tipText}</span>`;
    openFistCard.textContent = tipText.replace(/<[^>]*>/g, '');
  }

  /**
   * Show or hide all gesture hint cards
   */
  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (this.container) {
      this.container.style.opacity = visible ? '1' : '0';
      this.container.style.pointerEvents = visible ? 'auto' : 'none';
    }
  }

  public getContainerElement(): HTMLElement | null {
    return this.container;
  }
}
