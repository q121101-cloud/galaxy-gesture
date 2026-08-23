import * as THREE from 'three';
import { IScene, GestureState, SceneTransitionState, TransitionConfig } from './types';
import { TransitionManager } from '../scenes/TransitionManager';

export type TransitionCallback = (progress: number, fromScene: string, toScene: string) => void;

export class SceneManager {
  private scenes: Map<string, IScene> = new Map();
  private sceneOrder: string[] = [];
  private activeScene: IScene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;

  public readonly transitionManager: TransitionManager = new TransitionManager();

  private onTransitionStartListeners: Array<(from: string, to: string) => void> = [];
  private onTransitionProgressListeners: TransitionCallback[] = [];
  private onTransitionCompleteListeners: Array<(to: string) => void> = [];

  constructor() {
    // Synchronize TransitionManager events
    this.transitionManager.onStart((from, to) => {
      this.onTransitionStartListeners.forEach((cb) => cb(from ?? '', to));
    });

    this.transitionManager.onProgress((progress, from, to) => {
      this.onTransitionProgressListeners.forEach((cb) => cb(progress, from ?? '', to));
    });

    this.transitionManager.onComplete((to) => {
      const targetScene = this.scenes.get(to);
      if (targetScene) {
        this.activeScene = targetScene;
      }
      this.onTransitionCompleteListeners.forEach((cb) => cb(to));
    });
  }

  /**
   * Register a scene into the manager
   */
  public async registerScene(scene: IScene, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): Promise<void> {
    this.camera = camera;
    if (this.scenes.has(scene.name)) {
      console.warn(`[SceneManager] Scene '${scene.name}' already registered. Overwriting.`);
    }
    this.scenes.set(scene.name, scene);
    if (!this.sceneOrder.includes(scene.name)) {
      this.sceneOrder.push(scene.name);
    }
    await scene.init(renderer, camera);

    // If first scene registered, activate immediately
    if (!this.activeScene) {
      this.activeScene = scene;
      scene.onEnter();
    }
  }

  /**
   * Switch active scene with cinematic transition
   */
  public switchTo(sceneName: string, config?: Partial<TransitionConfig>): boolean {
    if (!this.scenes.has(sceneName)) {
      console.error(`[SceneManager] Cannot switch to non-existent scene '${sceneName}'`);
      return false;
    }

    if (this.activeScene && this.activeScene.name === sceneName && !this.transitionManager.isTransitioning()) {
      return true; // Already active
    }

    const toScene = this.scenes.get(sceneName)!;
    const fallbackCamera = this.camera ?? new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 2000);

    this.transitionManager.startTransition(this.activeScene, toScene, fallbackCamera, config);
    return true;
  }

  /**
   * Navigate circularly to next scene
   */
  public nextScene(config?: Partial<TransitionConfig>): boolean {
    if (this.sceneOrder.length < 2) return false;
    const currentIndex = this.activeScene ? this.sceneOrder.indexOf(this.activeScene.name) : -1;
    const nextIndex = (currentIndex + 1) % this.sceneOrder.length;
    return this.switchTo(this.sceneOrder[nextIndex], config);
  }

  /**
   * Navigate circularly to previous scene
   */
  public previousScene(config?: Partial<TransitionConfig>): boolean {
    if (this.sceneOrder.length < 2) return false;
    const currentIndex = this.activeScene ? this.sceneOrder.indexOf(this.activeScene.name) : 0;
    const prevIndex = (currentIndex - 1 + this.sceneOrder.length) % this.sceneOrder.length;
    return this.switchTo(this.sceneOrder[prevIndex], config);
  }

  /**
   * Update all active / transitioning scenes
   */
  public update(scaledDelta: number, rawDelta: number, timeDilation: number, gestureState: GestureState): void {
    // 1. Advance transition state using raw unscaled delta
    const fallbackCamera = this.camera ?? new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 2000);
    this.transitionManager.update(rawDelta, fallbackCamera);

    // 2. Update current active scene
    if (this.activeScene) {
      this.activeScene.update(scaledDelta, timeDilation, gestureState);
    }

    // If transitioning, also update target scene if not yet full active
    const transState = this.transitionManager.getState();
    if (transState.isTransitioning && transState.toScene) {
      const targetScene = this.scenes.get(transState.toScene);
      if (targetScene && targetScene !== this.activeScene) {
        targetScene.update(scaledDelta, timeDilation, gestureState);
      }
    }
  }

  /**
   * Render the active scene
   */
  public render(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void {
    if (this.activeScene) {
      this.activeScene.render(renderer, camera);
    }
  }

  public getActiveScene(): IScene | null {
    return this.activeScene;
  }

  public getActiveSceneName(): string {
    return this.activeScene ? this.activeScene.name : 'Unknown';
  }

  public getParticleCount(): number {
    return this.activeScene ? this.activeScene.particleCount : 0;
  }

  public getTransitionState(): Readonly<SceneTransitionState> {
    return this.transitionManager.getState();
  }

  public resize(width: number, height: number, pixelRatio: number): void {
    for (const scene of this.scenes.values()) {
      if (scene.resize) {
        scene.resize(width, height, pixelRatio);
      }
    }
  }

  public onTransitionStart(callback: (from: string, to: string) => void): () => void {
    this.onTransitionStartListeners.push(callback);
    return () => {
      this.onTransitionStartListeners = this.onTransitionStartListeners.filter((c) => c !== callback);
    };
  }

  public onTransitionProgress(callback: TransitionCallback): () => void {
    this.onTransitionProgressListeners.push(callback);
    return () => {
      this.onTransitionProgressListeners = this.onTransitionProgressListeners.filter((c) => c !== callback);
    };
  }

  public onTransitionComplete(callback: (to: string) => void): () => void {
    this.onTransitionCompleteListeners.push(callback);
    return () => {
      this.onTransitionCompleteListeners = this.onTransitionCompleteListeners.filter((c) => c !== callback);
    };
  }

  public dispose(): void {
    this.transitionManager.dispose();
    for (const scene of this.scenes.values()) {
      scene.dispose();
    }
    this.scenes.clear();
    this.activeScene = null;
    this.camera = null;
    this.onTransitionStartListeners = [];
    this.onTransitionProgressListeners = [];
    this.onTransitionCompleteListeners = [];
  }
}
